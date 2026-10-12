"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { askRagStream, REFUSAL } from "@/lib/rag";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  refused?: boolean;
  citations?: { evidence_id?: string; citation_location?: string }[];
};

type CopilotState = {
  open: boolean;
  expanded: boolean;
  accessToken: string;
  messages: ChatMessage[];
  trace: string[];
  loading: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setExpanded: (expanded: boolean) => void;
  setAccessToken: (accessToken: string) => void;
  clearChat: () => void;
  ask: (text: string) => Promise<void>;
};

export const useCopilot = create<CopilotState>()(
  persist(
    (set, get) => ({
      open: false,
      expanded: false,
      accessToken: "",
      messages: [],
      trace: [],
      loading: false,
      setOpen: (open) => set({ open }),
      toggle: () => set({ open: !get().open }),
      setExpanded: (expanded) => set({ expanded, open: true }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clearChat: () => set({ messages: [], trace: [] }),
      ask: async (text) => {
        const query = text.trim();
        const token = get().accessToken.trim();
        if (query.length < 2 || get().loading) return;
        if (!token) {
          set({
            open: true,
            messages: [
              ...get().messages,
              { id: crypto.randomUUID(), role: "user", content: query },
              { id: crypto.randomUUID(), role: "assistant", content: REFUSAL, refused: true },
            ],
          });
          return;
        }
        const assistantId = crypto.randomUUID();
        set({
          open: true,
          loading: true,
          trace: [],
          messages: [
            ...get().messages,
            { id: crypto.randomUUID(), role: "user", content: query },
            { id: assistantId, role: "assistant", content: "" },
          ],
        });
        const patch = (next: Partial<ChatMessage>) => {
          set({
            messages: get().messages.map((message) =>
              message.id === assistantId ? { ...message, ...next } : message,
            ),
          });
        };
        try {
          await askRagStream(query, token, {
            onTrace: (event) => {
              const step = event.step;
              if (step && !get().trace.includes(step)) set({ trace: [...get().trace, step] });
            },
            onToken: (piece) => {
              const current = get().messages.find((message) => message.id === assistantId);
              patch({ content: `${current?.content || ""}${piece}` });
            },
            onCitations: (citations) => patch({ citations: citations as ChatMessage["citations"] }),
            onRefused: () => patch({ content: REFUSAL, refused: true, citations: [] }),
            onDone: (result) => patch({ content: result.answer || "", citations: (result.citations || []) as ChatMessage["citations"], refused: false }),
          });
        } catch {
          patch({ content: REFUSAL, refused: true });
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: "bevel-copilot",
      partialize: (state) => ({
        open: state.open,
        expanded: state.expanded,
        accessToken: state.accessToken,
        messages: state.messages,
      }),
    },
  ),
);

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { inspectEvidence, askRag, askRagStream, REFUSAL } from '../lib/rag'
import { PERSONAS } from '../lib/personas'

const TRACE = ['identity', 'retrieval', 'authorization', 'evidence', 'generation', 'verification']

export const useCopilot = create(
  persist(
    (set, get) => ({
      open: false,
      expanded: false,
      width: 420,
      personaId: 'engineer',
      messages: [],
      context: null,
      evidence: null,
      trace: [],
      loading: false,
      setOpen: (open) => set({ open }),
      toggle: () => set({ open: !get().open }),
      setExpanded: (expanded) => set({ expanded, open: true }),
      setPersona: (personaId) => set({ personaId, messages: [], evidence: null, trace: [] }),
      setContext: (context) => set({ context }),
      clearChat: () => set({ messages: [], evidence: null, trace: [] }),
      ask: async (text, pagePath) => {
        const query = text.trim()
        if (query.length < 2 || get().loading) return
        const persona = PERSONAS.find((item) => item.id === get().personaId) || PERSONAS[0]
        const userMessage = { id: crypto.randomUUID(), role: 'user', content: query }
        const assistantId = crypto.randomUUID()
        const assistant = {
          id: assistantId,
          role: 'assistant',
          content: '',
          refused: false,
          claims: [],
          citations: [],
          pagePath,
        }
        set({
          open: true,
          loading: true,
          trace: [],
          messages: [...get().messages, userMessage, assistant],
        })
        const patchAssistant = (patch) => {
          set({
            messages: get().messages.map((message) =>
              message.id === assistantId ? { ...message, ...patch } : message,
            ),
          })
        }
        try {
          await askRagStream(query, persona.token, {
            onTrace: (event) => {
              const step = event.step
              const trace = get().trace
              if (step && !trace.includes(step)) set({ trace: [...trace, step] })
            },
            onToken: (text) => {
              const current = get().messages.find((message) => message.id === assistantId)
              patchAssistant({ content: `${current?.content || ''}${text}` })
            },
            onCitations: (citations) => patchAssistant({ citations }),
            onRefused: () => patchAssistant({ content: REFUSAL, refused: true, citations: [], claims: [] }),
            onDone: (result) => {
              patchAssistant({
                content: result.answer,
                claims: result.claims || [],
                citations: result.citations || [],
                refused: false,
              })
            },
          })
          set({ loading: false, trace: get().trace.length ? get().trace : TRACE })
        } catch (streamError) {
          try {
            const result = await askRag(query, persona.token)
            const refused = Boolean(result.abstained)
            patchAssistant({
              content: refused ? REFUSAL : result.answer,
              refused,
              reason: result.abstention_reason,
              claims: refused ? [] : result.claims || [],
              citations: refused ? [] : result.citations || [],
            })
            set({ loading: false, trace: TRACE })
          } catch (error) {
            set({ loading: false })
            patchAssistant({ content: REFUSAL, refused: true, reason: error.message || streamError.message })
          }
        }
      },
      openEvidence: async (evidenceId) => {
        const persona = PERSONAS.find((item) => item.id === get().personaId) || PERSONAS[0]
        const record = await inspectEvidence(evidenceId, persona.token)
        set({ evidence: record, expanded: true, open: true })
      },
    }),
    {
      name: 'bevel-copilot',
      partialize: (state) => ({
        open: state.open,
        expanded: state.expanded,
        width: state.width,
        personaId: state.personaId,
        messages: state.messages,
        context: state.context,
      }),
    },
  ),
)

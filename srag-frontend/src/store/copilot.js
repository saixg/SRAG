import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { inspectEvidence, askRag, askRagStream, REFUSAL } from '../lib/rag'
import { PERSONAS } from '../lib/personas'

/** Pipeline stages the backend emits over SSE, in order. */
const TRACE = ['identity', 'retrieval', 'authorization', 'evidence', 'generation', 'verification']

export const useCopilot = create(
  persist(
    (set, get) => ({
      personaId: 'engineer',
      messages: [],
      trace: [],
      loading: false,
      evidence: null,
      loadingEvidence: false,

      setPersona: (personaId) =>
        set({ personaId, messages: [], evidence: null, trace: [], loading: false }),

      clearChat: () => set({ messages: [], evidence: null, trace: [] }),

      ask: async (text) => {
        const query = (text || '').trim()
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
        }
        set({
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
            onToken: (chunk) => {
              const current = get().messages.find((message) => message.id === assistantId)
              patchAssistant({ content: `${current?.content || ''}${chunk}` })
            },
            onCitations: (citations) => patchAssistant({ citations }),
            onRefused: (data) =>
              patchAssistant({
                content: REFUSAL,
                refused: true,
                reason: data?.reason,
                citations: [],
                claims: [],
              }),
            onDone: (result) => {
              // `done` carries the verified response; it wins over streamed tokens.
              if (result?.abstained) {
                patchAssistant({ content: REFUSAL, refused: true, reason: result.abstention_reason, citations: [], claims: [] })
                return
              }
              patchAssistant({
                content: result?.answer ?? get().messages.find((m) => m.id === assistantId)?.content ?? '',
                claims: result?.claims || [],
                citations: result?.citations || [],
                refused: false,
              })
            },
          })
          set({ loading: false, trace: get().trace.length ? get().trace : TRACE })
        } catch (streamError) {
          // SSE unavailable (proxy, older server): fall back to the plain endpoint.
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
            patchAssistant({
              content: REFUSAL,
              refused: true,
              reason: error.message || streamError.message,
            })
          }
        }
      },

      openEvidence: async (evidenceId) => {
        const persona = PERSONAS.find((item) => item.id === get().personaId) || PERSONAS[0]
        set({ loadingEvidence: true, evidence: null })
        try {
          const record = await inspectEvidence(evidenceId, persona.token)
          set({ evidence: record, loadingEvidence: false })
        } catch {
          set({ evidence: null, loadingEvidence: false })
        }
      },

      closeEvidence: () => set({ evidence: null, loadingEvidence: false }),
    }),
    {
      name: 'securerag-workspace',
      // Evidence and in-flight state are deliberately not persisted - an
      // authorization decision must be re-checked, never restored from storage.
      partialize: (state) => ({
        personaId: state.personaId,
        messages: state.messages,
      }),
    },
  ),
)

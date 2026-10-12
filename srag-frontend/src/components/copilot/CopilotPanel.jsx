import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchMe } from '../../lib/rag'
import { PAGE_PROMPTS, PERSONAS } from '../../lib/personas'
import { useCopilot } from '../../store/copilot'
import { EvidenceViewer } from './EvidenceViewer'
import { PersonaSwitcher } from './PersonaSwitcher'
import { TrustTrace } from './TrustTrace'

export function CopilotPanel() {
  const location = useLocation()
  const {
    open,
    expanded,
    loading,
    messages,
    evidence,
    trace,
    toggle,
    setExpanded,
    setOpen,
    ask,
    openEvidence,
    clearChat,
  } = useCopilot()
  const personaId = useCopilot((s) => s.personaId)
  const persona = PERSONAS.find((item) => item.id === personaId)
  const [draft, setDraft] = useState('')
  const [identity, setIdentity] = useState(null)
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const listRef = useRef(null)
  const prompts = PAGE_PROMPTS[location.pathname] || PAGE_PROMPTS['/']
  const overlay = typeof window !== 'undefined' && window.innerWidth < 1280

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    let cancelled = false
    fetchMe(persona?.token).then((me) => {
      if (!cancelled) setIdentity(me)
    })
    return () => {
      cancelled = true
    }
  }, [persona?.token])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen, toggle])

  const send = (text) => {
    ask(text || draft, location.pathname)
    setDraft('')
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open Copilot"
        onClick={toggle}
        style={{
          position: 'fixed',
          right: 0,
          top: '42%',
          zIndex: 50,
          border: 0,
          borderRadius: '16px 0 0 16px',
          padding: '12px 10px',
          background: 'var(--color-charcoal)',
          color: 'var(--color-cloud-card)',
          cursor: 'pointer',
          display: open ? 'none' : 'block',
        }}
      >
        Ask
      </button>
      <AnimatePresence>
        {open ? (
          <motion.aside
            aria-label="Bevel Copilot"
            initial={overlay ? { y: 40, opacity: 0 } : { x: 40, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={overlay ? { y: 40, opacity: 0 } : { x: 40, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.24 }}
            style={{
              position: 'fixed',
              top: overlay ? 'auto' : 0,
              right: 0,
              bottom: 0,
              left: overlay ? 0 : 'auto',
              width: overlay ? '100%' : expanded ? 560 : 'var(--copilot-width)',
              height: overlay ? '78vh' : '100vh',
              background: 'var(--color-charcoal)',
              color: 'var(--color-cloud-card)',
              zIndex: 60,
              display: 'flex',
              flexDirection: 'column',
              padding: 16,
            }}
          >
            <header style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <strong>Bevel Copilot</strong>
                <p style={{ margin: '4px 0 0', fontSize: 'var(--text-caption)' }}>
                  {identity ? `${identity.tenant_name} · ${identity.roles?.join(', ')}` : `${persona?.label} · ${persona?.tenant}`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={clearChat} style={ghost}>New</button>
                <button type="button" onClick={() => setExpanded(!expanded)} style={ghost}>
                  {expanded ? 'Split' : 'Expand'}
                </button>
                <button type="button" onClick={() => setOpen(false)} style={ghost}>Close</button>
              </div>
            </header>
            <PersonaSwitcher />
            <TrustTrace steps={trace} />
            <div ref={listRef} style={{ flex: 1, overflow: 'auto', marginTop: 12, display: 'grid', gap: 12 }}>
              {messages.length === 0 ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {prompts.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => send(prompt)} style={chip}>
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : null}
              {messages.map((message) => (
                <article
                  key={message.id}
                  style={{
                    background: message.role === 'user' ? 'rgba(255,255,255,0.08)' : 'transparent',
                    borderRadius: 16,
                    padding: 12,
                  }}
                >
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p>
                  {message.refused ? (
                    <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-coral-signal)' }}>
                      No authorized evidence for this identity.
                    </p>
                  ) : null}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {(message.citations || []).map((citation, index) => (
                      <button
                        key={citation.evidence_id}
                        type="button"
                        onClick={() => openEvidence(citation.evidence_id)}
                        style={chip}
                      >
                        [{index + 1}] {citation.filename || citation.element_type} {citation.page_number ? `p.${citation.page_number}` : ''}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
              {loading ? <p style={{ fontSize: 'var(--text-caption)' }}>Checking authorized evidence…</p> : null}
              <EvidenceViewer evidence={evidence} onClose={() => useCopilot.setState({ evidence: null })} />
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                send()
              }}
              style={{ display: 'flex', gap: 8, marginTop: 12 }}
            >
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask anything…"
                rows={2}
                style={{
                  flex: 1,
                  resize: 'none',
                  border: 0,
                  borderRadius: 16,
                  padding: 12,
                  background: 'var(--color-paper-white)',
                  color: 'var(--color-ink)',
                }}
              />
              <button type="submit" disabled={loading} style={{ ...ghost, background: 'var(--color-paper-white)', color: 'var(--color-ink)' }}>
                Send
              </button>
            </form>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  )
}

const ghost = {
  border: 0,
  background: 'transparent',
  color: 'var(--color-cloud-card)',
  cursor: 'pointer',
}

const chip = {
  border: 0,
  textAlign: 'left',
  background: 'rgba(255,255,255,0.1)',
  color: 'var(--color-cloud-card)',
  borderRadius: 9999,
  padding: '6px 10px',
  cursor: 'pointer',
  fontSize: 12,
}

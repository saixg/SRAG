import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Composer } from '../components/securerag/Composer'
import { TrustTrace } from '../components/securerag/TrustTrace'
import { Icon } from '../components/ui/Icon'
import { Badge, Button, Card, IconTile, MicroLabel, Spinner } from '../components/ui/primitives'
import { useCopilot } from '../store/copilot'
import { usePersona } from '../lib/useApi'
import { citationLabel } from '../lib/format'

const STARTERS = [
  'What is the operating pressure of V-104?',
  'Which documents am I allowed to see?',
  'Summarise the maintenance procedure with citations.',
]

export function SecureRAG() {
  const [params, setParams] = useSearchParams()
  const messages = useCopilot((s) => s.messages)
  const loading = useCopilot((s) => s.loading)
  const trace = useCopilot((s) => s.trace)
  const ask = useCopilot((s) => s.ask)
  const clearChat = useCopilot((s) => s.clearChat)
  const openEvidence = useCopilot((s) => s.openEvidence)
  const persona = usePersona()
  const listRef = useRef(null)

  // A question handed over from Home or the top-bar search arrives as ?ask=
  const pending = params.get('ask')
  useEffect(() => {
    if (!pending) return
    setParams({}, { replace: true })
    ask(pending)
  }, [pending, ask, setParams])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const empty = messages.length === 0

  return (
    <div className="srag-chat">
      <header className="srag-chat__head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
          <IconTile name="sparkle" />
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 'var(--text-lg)', letterSpacing: 'var(--tracking-lg)' }}>SecureRAG</h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-body)' }}>
              Answering as {persona.label} · {persona.tenant}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <Badge tone="neutral">
            <Icon name="lock" size={12} />
            Private by design
          </Badge>
          {!empty ? (
            <Button variant="outline" size="sm" icon="plus" onClick={clearChat}>
              New conversation
            </Button>
          ) : null}
        </div>
      </header>

      <div ref={listRef} className="srag-chat__scroll">
        <div className="srag-chat__inner">
          {empty ? (
            <div style={{ display: 'grid', gap: 'var(--space-5)', paddingTop: 'var(--space-8)' }}>
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                <h2
                  style={{
                    fontSize: 'var(--text-xl)',
                    letterSpacing: 'var(--tracking-xl)',
                  }}
                >
                  Ask across authorized evidence
                </h2>
                <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-base)' }}>
                  Retrieval is filtered by your identity before anything reaches the model. If no
                  evidence you can access supports an answer, SecureRAG abstains instead of guessing.
                </p>
              </div>
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                <MicroLabel>Try asking</MicroLabel>
                {STARTERS.map((starter) => (
                  <button key={starter} type="button" onClick={() => ask(starter)} className="srag-starter">
                    <Icon name="chat" size={16} style={{ color: 'var(--ink-subtle)' }} />
                    <span style={{ flex: 1 }}>{starter}</span>
                    <Icon name="chevronRight" size={15} style={{ color: 'var(--ink-subtle)' }} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul style={{ display: 'grid', gap: 'var(--space-6)', paddingTop: 'var(--space-6)' }}>
              {messages.map((message) => (
                <li key={message.id}>
                  {message.role === 'user' ? (
                    <UserMessage content={message.content} />
                  ) : (
                    <AssistantMessage
                      message={message}
                      onOpenEvidence={openEvidence}
                      streaming={loading && message === messages[messages.length - 1]}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}

          {loading ? (
            <div style={{ paddingTop: 'var(--space-4)' }}>
              <TrustTrace steps={trace} active />
            </div>
          ) : null}
        </div>
      </div>

      <div className="srag-chat__composer">
        <div className="srag-chat__inner">
          <Composer
            onSubmit={ask}
            busy={loading}
            autoFocus
            placeholder="Ask anything about documents you can access…"
            footnote="Answers respect your permissions and never train public models."
          />
        </div>
      </div>
    </div>
  )
}

function UserMessage({ content }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <p
        style={{
          maxWidth: '82%',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--accent)',
          color: 'var(--ink-inverse)',
          fontSize: 'var(--text-base)',
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
        }}
      >
        {content}
      </p>
    </div>
  )
}

function AssistantMessage({ message, onOpenEvidence, streaming }) {
  const refused = message.refused
  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
      <IconTile name="sparkle" tone={refused ? 'neutral' : 'soft'} size={32} />
      <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 'var(--space-3)' }}>
        {refused ? (
          <Card
            style={{
              background: 'var(--surface-sunken)',
              borderColor: 'var(--border)',
              display: 'grid',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="lock" size={16} style={{ color: 'var(--ink-muted)' }} />
              <strong style={{ fontSize: 'var(--text-body)', color: 'var(--ink-strong)' }}>
                No authorized evidence
              </strong>
            </div>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--ink-muted)', lineHeight: 1.55 }}>
              {message.content}
            </p>
            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-subtle)' }}>
              This response is identical whether the evidence does not exist or is outside your
              scope. That is by design, so an answer cannot be used to probe for hidden documents.
            </p>
          </Card>
        ) : (
          <p
            style={{
              fontSize: 'var(--text-base)',
              lineHeight: 1.65,
              color: 'var(--ink)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {message.content}
            {streaming && !message.content ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--ink-muted)' }}>
                <Spinner size={14} label="Generating" />
                Checking authorized evidence…
              </span>
            ) : null}
          </p>
        )}

        {message.citations?.length ? (
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            <MicroLabel>Citations</MicroLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {message.citations.map((citation, index) => (
                <button
                  key={citation.evidence_id}
                  type="button"
                  onClick={() => onOpenEvidence(citation.evidence_id)}
                  className="srag-citation"
                >
                  <span className="srag-citation__index">{index + 1}</span>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {citationLabel(citation)}
                  </span>
                  {citation.page_number != null ? (
                    <span style={{ color: 'var(--ink-subtle)' }}>p.{citation.page_number}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

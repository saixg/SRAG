import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Composer } from '../components/securerag/Composer'
import { Icon } from '../components/ui/Icon'
import {
  Badge,
  Card,
  EmptyState,
  ErrorNote,
  IconTile,
  LoadingBlock,
  MicroLabel,
  Skeleton,
} from '../components/ui/primitives'
import { Reveal } from '../components/motion'
import { fetchAudit, fetchCollections, fetchDocuments, fetchWorkspace } from '../lib/rag'
import { useApiResource } from '../lib/useApi'
import { formatDay, greetingFor, iconForAction, labelForAction, relativeTime } from '../lib/format'

/* Quick actions are the real capabilities this product has: multimodal
   retrieval over text, tables, OCR and figures. */
const QUICK_ACTIONS = [
  {
    icon: 'diagram',
    title: 'Trace an answer to its source',
    body: 'Every claim resolves to an evidence unit you are cleared to open.',
    prompt: 'What is the operating pressure of V-104?',
  },
  {
    icon: 'table',
    title: 'Read a table you have access to',
    body: 'Structured rows are retrieved and cited as tables, not flattened text.',
    prompt: 'Summarise the specification table for the coolant system.',
  },
  {
    icon: 'scan',
    title: 'Search scanned pages',
    body: 'OCR text and figure regions are retrievable with page and bounding box.',
    prompt: 'What do the scanned maintenance notes say about the valve?',
  },
]

export function Home() {
  const navigate = useNavigate()
  const { data: summary, loading, error, reload, persona } = useApiResource(fetchWorkspace)
  // Read the clock once per mount so re-renders stay pure.
  const [openedAt] = useState(() => new Date())

  const ask = (text) => navigate(`/securerag?ask=${encodeURIComponent(text)}`)

  return (
    <div className="srag-page srag-page--with-rail">
      <div className="srag-col" style={{ display: 'grid', gap: 'var(--space-6)', alignContent: 'start', minWidth: 0 }}>
        <header style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {/* A sentence, not a category label, so it is not set in the
              uppercase wide-tracked micro register the section labels use. */}
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--ink-muted)' }}>
            <span className="srag-num">{formatDay(openedAt)}</span>
            {'  '}
            <span style={{ color: 'var(--ink-subtle)' }}>·</span>
            {'  '}
            {greetingFor(openedAt)}, {persona.label}
          </p>
          <h1
            style={{
              fontSize: 'var(--text-display)',
              letterSpacing: 'var(--tracking-display)',
              lineHeight: 1.15,
            }}
          >
            What can we help you find?
          </h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-base)', maxWidth: 640 }}>
            Ask across your company knowledge. Answers stay grounded in sources you are permitted to see.
          </p>
        </header>

        <Card padded={false}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-5)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <IconTile name="sparkle" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 'var(--text-lg)', letterSpacing: 'var(--tracking-lg)' }}>SecureRAG</h2>
              <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-body)' }}>
                Multimodal company intelligence
              </p>
            </div>
            <Badge tone="neutral">
              <Icon name="lock" size={12} />
              Private by design
            </Badge>
          </div>

          <div className="srag-quick-grid" style={{ padding: 'var(--space-5)' }}>
            {QUICK_ACTIONS.map((action, i) => (
              <Reveal
                key={action.title}
                as="button"
                index={i}
                type="button"
                onClick={() => ask(action.prompt)}
                className="srag-quick-card"
              >
                <IconTile name={action.icon} tone="soft" size={36} />
                <span style={{ display: 'grid', gap: 4, flex: 1 }}>
                  <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--ink-strong)' }}>
                    {action.title}
                  </span>
                  <span style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-body)', lineHeight: 1.45 }}>
                    {action.body}
                  </span>
                </span>
                <Icon name="chevronRight" size={16} style={{ color: 'var(--ink-subtle)' }} />
              </Reveal>
            ))}
          </div>

          <div style={{ padding: '0 var(--space-5) var(--space-5)' }}>
            <Composer
              onSubmit={ask}
              footnote="Answers respect your permissions and are verified against authorized evidence."
            />
          </div>
        </Card>

        <ErrorNote onRetry={reload}>{error}</ErrorNote>

        <div className="srag-stat-grid">
          {[
            ['Documents', summary?.document_count, 'file', '/knowledge'],
            ['Evidence units', summary?.evidence_count, 'inbox', '/evidence'],
            ['Collections', summary?.collection_count, 'book', '/knowledge'],
            ['Audit events', summary?.recent_audit_count, 'clock', '/audit'],
          ].map(([label, value, icon, to]) => (
            <Link key={label} to={to} className="srag-stat-card">
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-muted)' }}>
                <Icon name={icon} size={16} />
                <span style={{ fontSize: 'var(--text-body)' }}>{label}</span>
              </span>
              {loading ? (
                <Skeleton width={48} height={26} />
              ) : (
                <strong
                  className="srag-num"
                  style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-medium)', color: 'var(--ink-strong)' }}
                >
                  {value ?? '-'}
                </strong>
              )}
            </Link>
          ))}
        </div>
      </div>

      <aside className="srag-rail">
        <SecureScopePanel />
        <RecentPanel />
      </aside>
    </div>
  )
}

/**
 * "Your secure scope" - bound to the real authorization context (identity
 * roles and the collections this tenant actually holds), not to third-party
 * connectors the backend does not have.
 */
function SecureScopePanel() {
  const { data: collections, loading, error, persona } = useApiResource(fetchCollections)

  return (
    <Card padded={false}>
      <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Icon name="shield" size={18} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: 'var(--text-base)', flex: 1 }}>Your secure scope</h2>
          <Link
            to="/security"
            className="srag-text-action"
            style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-ink)', fontWeight: 'var(--weight-medium)' }}
          >
            Manage
          </Link>
        </div>
        <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-body)', marginTop: 6 }}>
          SecureRAG only searches content you're already permitted to view.
        </p>
      </div>

      <div style={{ padding: 'var(--space-4) var(--space-5)', display: 'grid', gap: 'var(--space-3)' }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <MicroLabel>Identity</MicroLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Badge tone="accent">{persona.tenant}</Badge>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <MicroLabel>Collections in scope</MicroLabel>
          {loading ? (
            <LoadingBlock rows={2} height={34} state="searching" label="Resolving your scope…" />
          ) : error ? (
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--ink-subtle)' }}>Unavailable</p>
          ) : collections?.length ? (
            collections.map((collection) => (
              <div
                key={collection.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-sunken)',
                }}
              >
                <IconTile name="book" tone="soft" size={30} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 'var(--weight-medium)', color: 'var(--ink-strong)' }}>
                    {collection.name}
                  </span>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-muted)' }}>
                    <span className="srag-num">{collection.document_count}</span> document{collection.document_count === 1 ? '' : 's'}
                  </span>
                </span>
                <Icon name="checkCircle" size={18} style={{ color: 'var(--status-ok)' }} />
              </div>
            ))
          ) : (
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--ink-subtle)' }}>
              No collections yet. Documents you upload are scoped to your tenant by default.
            </p>
          )}
        </div>

        <Link to="/knowledge" className="srag-dashed-action">
          <Icon name="plus" size={16} />
          Add a document
        </Link>
      </div>
    </Card>
  )
}

/** "Recent" - real audit events for this tenant. */
function RecentPanel() {
  const { data: events, loading, error } = useApiResource((token) => fetchAudit(token))
  const { data: documents } = useApiResource(fetchDocuments)

  const byId = new Map((documents || []).map((doc) => [doc.id, doc.filename]))
  const recent = (events || []).slice(0, 5)

  return (
    <Card padded={false}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-5)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Icon name="clock" size={18} style={{ color: 'var(--ink-muted)' }} />
        <h2 style={{ fontSize: 'var(--text-base)', flex: 1 }}>Recent</h2>
        <Link
            to="/audit"
            className="srag-text-action"
            style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-ink)', fontWeight: 'var(--weight-medium)' }}
          >
          View all
        </Link>
      </div>
      <div style={{ padding: 'var(--space-3) var(--space-3)' }}>
        {loading ? (
          <div style={{ padding: 'var(--space-2)' }}>
            <LoadingBlock rows={3} height={40} gap="10px" state="searching" label="Loading recent activity…" />
          </div>
        ) : error ? (
          <p style={{ padding: 'var(--space-3)', fontSize: 'var(--text-body)', color: 'var(--ink-subtle)' }}>
            Unavailable
          </p>
        ) : recent.length ? (
          <ul style={{ display: 'grid', gap: 2 }}>
            {recent.map((event) => (
              <li
                key={event.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: '10px 10px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <IconTile name={iconForAction(event.action)} tone="neutral" size={32} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      display: 'block',
                      fontWeight: 'var(--weight-medium)',
                      color: 'var(--ink-strong)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {labelForAction(event.action)}
                  </span>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-muted)' }}>
                    {relativeTime(event.created_at)}
                    {byId.get(event.resource_id) ? ` · ${byId.get(event.resource_id)}` : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="clock"
            title="No activity yet"
            description="Queries and uploads in this tenant will appear here."
          />
        )}
      </div>
    </Card>
  )
}


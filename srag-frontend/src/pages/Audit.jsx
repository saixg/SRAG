import { Fragment, useMemo, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  PageHeader,
  Skeleton,
} from '../components/ui/primitives'
import { fetchAudit } from '../lib/rag'
import { useApiResource } from '../lib/useApi'
import { labelForAction, relativeTime } from '../lib/format'

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'query', label: 'Queries' },
  { id: 'document', label: 'Documents' },
]

export function Audit() {
  const { data: events, loading, error, reload } = useApiResource(fetchAudit)
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState(null)

  const rows = useMemo(
    () => (events || []).filter((event) => !filter || (event.action || '').startsWith(filter)),
    [events, filter],
  )

  return (
    <div className="srag-page">
      <div style={{ display: 'grid', gap: 'var(--space-6)', alignContent: 'start' }}>
        <PageHeader
          eyebrow="Audit"
          title="What happened in this tenant"
          description="Append-only events recorded inside the same tenant-bound session as the operation itself. You can only see your own tenant's trail."
          actions={
            <Button variant="outline" icon="refresh" onClick={reload} disabled={loading}>
              Refresh
            </Button>
          }
        />

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {FILTERS.map((item) => {
            const active = filter === item.id
            return (
              <button
                key={item.id || 'all'}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={active}
                className="srag-chip"
              >
                {item.label}
              </button>
            )
          })}
        </div>

        <ErrorNote onRetry={reload}>{error}</ErrorNote>

        {loading ? (
          <Card padded={false} style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-2)' }}>
            <Skeleton height={52} radius="var(--radius-sm)" />
            <Skeleton height={52} radius="var(--radius-sm)" />
            <Skeleton height={52} radius="var(--radius-sm)" />
          </Card>
        ) : rows.length ? (
          <Card padded={false}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body)' }}>
                <caption className="sr-only">Audit events for this tenant</caption>
                <thead>
                  <tr>
                    {['Event', 'Resource', 'Actor', 'When', ''].map((heading, i) => (
                      <th
                        key={heading || i}
                        scope="col"
                        style={{
                          textAlign: 'left',
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border)',
                          background: 'var(--surface-sunken)',
                          fontSize: 'var(--text-micro)',
                          letterSpacing: 'var(--tracking-micro)',
                          textTransform: 'uppercase',
                          color: 'var(--ink-muted)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((event) => {
                    const isOpen = expanded === event.id
                    const hasDetails = event.details && Object.keys(event.details).length > 0
                    return (
                      <Fragment key={event.id}>
                        <tr>
                          <td style={cell}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Badge tone={toneForAction(event.action)}>{event.action}</Badge>
                            </span>
                            <span style={{ display: 'block', color: 'var(--ink-muted)', fontSize: 'var(--text-caption)', marginTop: 4 }}>
                              {labelForAction(event.action)}
                            </span>
                          </td>
                          <td style={{ ...cell, color: 'var(--ink-muted)' }}>
                            {event.resource_type ? (
                              <>
                                <span style={{ color: 'var(--ink)' }}>{event.resource_type}</span>
                                {event.resource_id ? (
                                  <span
                                    title={event.resource_id}
                                    className="srag-num"
                                    style={{ display: 'block', fontSize: 'var(--text-caption)' }}
                                  >
                                    {String(event.resource_id).slice(0, 8)}…
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="srag-num" style={{ ...cell, color: 'var(--ink-muted)', fontSize: 'var(--text-caption)' }}>
                            {event.user_id ? `${String(event.user_id).slice(0, 8)}…` : '-'}
                          </td>
                          <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                            <span style={{ color: 'var(--ink)' }}>{relativeTime(event.created_at)}</span>
                            <span className="srag-num" style={{ display: 'block', color: 'var(--ink-muted)', fontSize: 'var(--text-caption)' }}>
                              {event.created_at ? new Date(event.created_at).toLocaleString() : ''}
                            </span>
                          </td>
                          <td style={{ ...cell, textAlign: 'right' }}>
                            {hasDetails ? (
                              <button
                                type="button"
                                onClick={() => setExpanded(isOpen ? null : event.id)}
                                aria-expanded={isOpen}
                                className="srag-text-action"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  border: 0,
                                  background: 'transparent',
                                  color: 'var(--accent-ink)',
                                  fontSize: 'var(--text-sm)',
                                  fontWeight: 'var(--weight-medium)',
                                  cursor: 'pointer',
                                }}
                              >
                                Details
                                <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={14} />
                              </button>
                            ) : null}
                          </td>
                        </tr>
                        {isOpen ? (
                          <tr key={`${event.id}-details`}>
                            <td colSpan={5} style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--border)' }}>
                              <pre
                                style={{
                                  margin: 0,
                                  padding: 'var(--space-3)',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'var(--surface-sunken)',
                                  fontSize: 'var(--text-caption)',
                                  fontFamily: 'var(--font-mono)',
                                  overflowX: 'auto',
                                  color: 'var(--ink)',
                                }}
                              >
                                {JSON.stringify(event.details, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon="clock"
              title={filter ? 'No events match this filter' : 'No audit events yet'}
              description={
                filter
                  ? 'Try a different filter.'
                  : 'Ask a question or ingest a document. Both record audit events in this tenant.'
              }
            />
          </Card>
        )}
      </div>
    </div>
  )
}

const cell = {
  padding: '14px 16px',
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'top',
}

function toneForAction(action = '') {
  if (action.includes('denied')) return 'danger'
  if (action.includes('abstain')) return 'warn'
  if (action.startsWith('document')) return 'accent'
  return 'neutral'
}

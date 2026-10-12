import { useEffect, useRef, useState } from 'react'
import { fetchVisual } from '../../lib/rag'
import { PERSONAS } from '../../lib/personas'
import { useCopilot } from '../../store/copilot'
import { Icon } from '../ui/Icon'
import { Badge, EmptyState, Spinner } from '../ui/primitives'
import { citationLabel } from '../../lib/format'

/**
 * Global evidence inspector. Opened by citation chips anywhere in the app via
 * useCopilot.openEvidence(). Renders the authorized evidence record returned by
 * GET /evidence/{id}/inspect - including the stored visual with its bbox
 * overlay, and structured table content when the unit is a table.
 */
export function EvidenceDrawer() {
  const evidence = useCopilot((s) => s.evidence)
  const loadingEvidence = useCopilot((s) => s.loadingEvidence)
  const closeEvidence = useCopilot((s) => s.closeEvidence)
  const personaId = useCopilot((s) => s.personaId)
  const persona = PERSONAS.find((p) => p.id === personaId) || PERSONAS[0]
  const [visualUrl, setVisualUrl] = useState(null)
  const [visualPending, setVisualPending] = useState(false)
  const panelRef = useRef(null)

  const open = Boolean(evidence) || loadingEvidence

  useEffect(() => {
    if (!evidence?.visual_reference_id) {
      setVisualUrl(null)
      setVisualPending(false)
      return undefined
    }
    let url = ''
    let cancelled = false
    setVisualPending(true)
    fetchVisual(persona.token, evidence.evidence_id)
      .then((blob) => {
        if (cancelled) return
        if (blob) {
          url = URL.createObjectURL(blob)
          setVisualUrl(url)
        } else {
          setVisualUrl(null)
        }
      })
      .finally(() => {
        if (!cancelled) setVisualPending(false)
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [evidence, persona.token])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') closeEvidence()
    }
    window.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeEvidence])

  if (!open) return null

  const bbox = Array.isArray(evidence?.bbox) && evidence.bbox.length === 4 ? evidence.bbox : null
  const rows = evidence?.structured_content?.rows
  const headers = evidence?.structured_content?.headers

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', justifyContent: 'flex-end' }}>
      <button
        type="button"
        aria-label="Close evidence"
        onClick={closeEvidence}
        className="srag-fade"
        style={{
          position: 'absolute',
          inset: 0,
          border: 0,
          padding: 0,
          background: 'var(--surface-scrim)',
          cursor: 'pointer',
        }}
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Evidence inspector"
        className="srag-slide-in"
        style={{
          position: 'relative',
          width: 'min(520px, 100%)',
          height: '100%',
          background: 'var(--surface-raised)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
            padding: 'var(--space-5)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 'var(--text-micro)',
                letterSpacing: 'var(--tracking-micro)',
                textTransform: 'uppercase',
                fontWeight: 'var(--weight-semibold)',
                color: 'var(--ink-subtle)',
              }}
            >
              Authorized evidence
            </p>
            <h2 style={{ fontSize: 'var(--text-lg)', letterSpacing: 'var(--tracking-lg)', marginTop: 4 }}>
              {evidence ? citationLabel(evidence) : 'Source'}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeEvidence}
            aria-label="Close"
            style={{
              border: '1px solid var(--border)',
              background: 'var(--surface-raised)',
              borderRadius: 'var(--radius-sm)',
              padding: 7,
              cursor: 'pointer',
              color: 'var(--ink-muted)',
            }}
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-5)', display: 'grid', gap: 'var(--space-4)', alignContent: 'start' }}>
          {loadingEvidence ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-muted)' }}>
              <Spinner size={16} label="Loading evidence" />
              Opening authorized source…
            </div>
          ) : !evidence ? (
            <EmptyState
              icon="lock"
              title="Evidence not available"
              description="This evidence either does not exist or is outside your authorization scope. The response is intentionally identical in both cases."
            />
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <Badge tone="accent">{evidence.element_type}</Badge>
                {evidence.page_number != null ? <Badge>Page {evidence.page_number}</Badge> : null}
                {evidence.authorized ? <Badge tone="ok">Authorized</Badge> : null}
              </div>

              {evidence.citation_location ? (
                <p style={{ fontSize: 'var(--text-body)', color: 'var(--ink-muted)' }}>
                  {evidence.citation_location}
                </p>
              ) : null}

              {visualPending ? (
                <div
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    height: 180,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-sunken)',
                    color: 'var(--ink-muted)',
                  }}
                >
                  <Spinner size={18} label="Loading image" />
                </div>
              ) : visualUrl ? (
                <figure style={{ margin: 0, position: 'relative' }}>
                  <img
                    src={visualUrl}
                    alt={`Visual evidence from ${evidence.filename || 'source document'}`}
                    style={{
                      width: '100%',
                      display: 'block',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                    }}
                  />
                  {bbox ? (
                    <span
                      aria-label="Cited region"
                      style={{
                        position: 'absolute',
                        left: `${bbox[0]}%`,
                        top: `${bbox[1]}%`,
                        width: `${Math.max(bbox[2] - bbox[0], 3)}%`,
                        height: `${Math.max(bbox[3] - bbox[1], 3)}%`,
                        border: '2px solid var(--accent)',
                        borderRadius: 'var(--radius-xs)',
                        background: 'var(--accent-tint)',
                      }}
                    />
                  ) : null}
                </figure>
              ) : null}

              {rows?.length ? (
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                    {headers?.length ? (
                      <thead>
                        <tr>
                          {headers.map((header, i) => (
                            <th
                              key={`${header}-${i}`}
                              scope="col"
                              style={{
                                textAlign: 'left',
                                padding: '10px 12px',
                                borderBottom: '1px solid var(--border)',
                                background: 'var(--surface-sunken)',
                                fontWeight: 'var(--weight-semibold)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                    ) : null}
                    <tbody>
                      {rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              style={{
                                padding: '10px 12px',
                                borderBottom: '1px solid var(--border)',
                                color: 'var(--ink)',
                              }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : evidence.text_content ? (
                <blockquote
                  style={{
                    margin: 0,
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-sunken)',
                    borderLeft: '3px solid var(--accent)',
                    whiteSpace: 'pre-wrap',
                    fontSize: 'var(--text-body)',
                    lineHeight: 1.6,
                    color: 'var(--ink)',
                  }}
                >
                  {evidence.text_content}
                </blockquote>
              ) : (
                <p style={{ color: 'var(--ink-subtle)', fontSize: 'var(--text-body)' }}>
                  This unit carries no textual content.
                </p>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

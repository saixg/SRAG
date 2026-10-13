import { useSearchParams } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Badge, Card, EmptyState, ErrorNote, IconTile, LoadingBlock, PageHeader } from '../components/ui/primitives'
import { fetchDocuments, fetchEvidenceList } from '../lib/rag'
import { useApiResource } from '../lib/useApi'
import { useCopilot } from '../store/copilot'

/* The modalities the ingestion pipeline actually produces. */
const MODALITIES = [
  { id: '', label: 'All' },
  { id: 'text', label: 'Text' },
  { id: 'table', label: 'Tables' },
  { id: 'ocr', label: 'OCR' },
  { id: 'image', label: 'Images' },
  { id: 'figure', label: 'Figures' },
  { id: 'diagram', label: 'Diagrams' },
]

export function Evidence() {
  const [params, setParams] = useSearchParams()
  const documentId = params.get('document') || ''
  const elementType = params.get('type') || ''
  const openEvidence = useCopilot((s) => s.openEvidence)

  const { data: documents } = useApiResource(fetchDocuments)
  const { data: units, loading, error, reload } = useApiResource(
    (token) =>
      fetchEvidenceList(token, {
        documentId: documentId || undefined,
        elementType: elementType || undefined,
        limit: 100,
      }),
    [documentId, elementType],
  )

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className="srag-page">
      <div style={{ display: 'grid', gap: 'var(--space-6)', alignContent: 'start' }}>
        <PageHeader
          eyebrow="Evidence"
          title="Every unit you are cleared to open"
          description="Evidence is the unit of authorization: each paragraph, table, OCR line and figure carries its own access scope and provenance. Anything outside your scope is not listed here at all."
        />

        <Card padded={false} style={{ padding: 'var(--space-4) var(--space-5)' }}>
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', fontWeight: 'var(--weight-medium)' }}>
                Modality
              </span>
              {MODALITIES.map((modality) => {
                const active = elementType === modality.id
                return (
                  <button
                    key={modality.id || 'all'}
                    type="button"
                    onClick={() => setParam('type', modality.id)}
                    aria-pressed={active}
                    className="srag-chip"
                  >
                    {modality.label}
                  </button>
                )
              })}
            </div>

            <label style={{ display: 'grid', gap: 6, maxWidth: 420 }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', fontWeight: 'var(--weight-medium)' }}>
                Document
              </span>
              <select
                value={documentId}
                onChange={(event) => setParam('document', event.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-raised)',
                  color: 'var(--ink-strong)',
                  cursor: 'pointer',
                }}
              >
                <option value="">All documents</option>
                {(documents || []).map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.filename}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        <ErrorNote onRetry={reload}>{error}</ErrorNote>

        {loading ? (
          <LoadingBlock rows={3} height={84} state="searching" label="Loading authorized evidence…" />
        ) : units?.length ? (
          <ul style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {units.map((unit) => (
              <li key={unit.evidence_id}>
                <button
                  type="button"
                  onClick={() => openEvidence(unit.evidence_id)}
                  className="srag-evidence-row"
                >
                  <IconTile name={iconForType(unit.element_type)} tone="neutral" size={36} />
                  <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 4, textAlign: 'left' }}>
                    <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Badge tone="accent">{unit.element_type}</Badge>
                      {unit.source_location?.page_number != null ? (
                        <Badge>Page {unit.source_location.page_number}</Badge>
                      ) : null}
                      {unit.security_scope && Object.keys(unit.security_scope).length ? (
                        <Badge tone="warn">
                          <Icon name="lock" size={11} />
                          Restricted
                        </Badge>
                      ) : null}
                    </span>
                    <span
                      style={{
                        color: 'var(--ink)',
                        fontSize: 'var(--text-body)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {unit.text_content || <em style={{ color: 'var(--ink-subtle)' }}>Visual evidence, no text content</em>}
                    </span>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-subtle)' }}>
                      {unit.provenance?.source_filename} · {unit.provenance?.extraction_method}
                    </span>
                  </span>
                  <Icon name="chevronRight" size={16} style={{ color: 'var(--ink-subtle)' }} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Card>
            <EmptyState
              icon="inbox"
              title="No evidence in scope"
              description={
                documentId || elementType
                  ? 'No units match these filters within your authorization scope.'
                  : 'Ingest a document on the Knowledge page to produce evidence units.'
              }
            />
          </Card>
        )}
      </div>
    </div>
  )
}

function iconForType(type) {
  if (type === 'table') return 'table'
  if (type === 'ocr') return 'scan'
  if (type === 'image' || type === 'figure') return 'image'
  if (type === 'diagram') return 'diagram'
  return 'file'
}

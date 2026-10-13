import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Badge, Button, Card, EmptyState, ErrorNote, IconTile, LoadingBlock, MicroLabel, PageHeader, Spinner, TextInput } from '../components/ui/primitives'
import { Composer } from '../components/securerag/Composer'
import { assignCollection, fetchCollections, fetchDocuments, uploadDocument } from '../lib/rag'
import { useApiResource, usePersona } from '../lib/useApi'
import { labelForOrbState } from '../lib/format'

const ACCEPTED = '.txt, .md, .pdf, .png, .jpg, .jpeg, .tiff, .webp'

export function Knowledge() {
  const persona = usePersona()
  const navigate = useNavigate()
  const { data: documents, loading, error, reload } = useApiResource(fetchDocuments)
  const { data: collections, reload: reloadCollections } = useApiResource(fetchCollections)

  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [uploadError, setUploadError] = useState('')

  const upload = async (file) => {
    setBusy(true)
    setUploadError('')
    setNotice(null)
    try {
      const result = await uploadDocument(persona.token, file)
      // 202 means accepted for background parsing - say so rather than
      // claiming the document is ready to query.
      setNotice(
        result?.status === 'processing'
          ? { tone: 'warn', text: `${file.name} accepted. Parsing in the background.` }
          : { tone: 'ok', text: `${file.name} ingested and ready to query.` },
      )
      await Promise.all([reload(), reloadCollections()])
    } catch (err) {
      setUploadError(err.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="srag-page">
      <div style={{ display: 'grid', gap: 'var(--space-6)', alignContent: 'start' }}>
        <PageHeader
          eyebrow="Knowledge"
          title="Content this identity can see"
          description="Uploads stay inside your tenant. Text files are ready immediately; PDFs and images are parsed in the background for layout, tables, OCR and figures."
          actions={
            <Button variant="outline" icon="refresh" onClick={reload} disabled={loading}>
              Refresh
            </Button>
          }
        />

        <Card padded={false}>
          <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <IconTile name="plus" tone="soft" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: 'var(--text-lg)', letterSpacing: 'var(--tracking-lg)' }}>Add content</h2>
                <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-body)' }}>
                  Accepted: {ACCEPTED}
                </p>
              </div>
            </div>
          </div>
          <div style={{ padding: 'var(--space-5)', display: 'grid', gap: 'var(--space-3)' }}>
            <Composer
              attachments
              onAttach={upload}
              onSubmit={(text) => navigate(`/securerag?ask=${encodeURIComponent(text)}`)}
              busy={busy}
              placeholder="Ask about this knowledge base, or attach files, images and scans…"
            />
            {busy ? (
              /*
                Was a static refresh glyph next to the words -- an icon that
                looked like it should be spinning and wasn't. Ingest is the
                longest wait in the product, so it gets the same orb as every
                other wait, in the state that names what it is doing.
              */
              <p
                role="status"
                aria-live="polite"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-body)', color: 'var(--ink-muted)' }}
              >
                <Spinner size={16} state="weaving" />
                {labelForOrbState('weaving')}
              </p>
            ) : null}
            <ErrorNote>{uploadError}</ErrorNote>
            {notice ? (
              <p
                role="status"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-sm)',
                  background: notice.tone === 'ok' ? 'var(--status-ok-soft)' : 'var(--status-warn-soft)',
                  color: notice.tone === 'ok' ? 'var(--status-ok)' : 'var(--status-warn)',
                  fontSize: 'var(--text-body)',
                }}
              >
                <Icon name={notice.tone === 'ok' ? 'checkCircle' : 'clock'} size={16} />
                {notice.text}
              </p>
            ) : null}
          </div>
        </Card>

        <ErrorNote onRetry={reload}>{error}</ErrorNote>

        <section style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', letterSpacing: 'var(--tracking-lg)' }}>Documents</h2>
            <MicroLabel>{documents?.length ? `${documents.length} total` : ''}</MicroLabel>
          </div>

          {loading ? (
            <LoadingBlock rows={3} height={72} state="searching" label="Loading documents…" />
          ) : documents?.length ? (
            <ul style={{ display: 'grid', gap: 'var(--space-2)' }}>
              {documents.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  collections={collections || []}
                  token={persona.token}
                  onSaved={() => Promise.all([reload(), reloadCollections()])}
                />
              ))}
            </ul>
          ) : (
            <Card>
              <EmptyState
                icon="file"
                title="No documents yet"
                description="Attach a file above to ingest it. Evidence units are extracted per paragraph, table, OCR line and figure. Each one inherits this document's access scope."
              />
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}

function DocumentRow({ document, collections, token, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(document.collection || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await assignCollection(token, document.id, value.trim())
      setEditing(false)
      await onSaved()
    } catch (err) {
      setError(err.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const processing = document.status === 'processing'

  return (
    <li>
      <Card padded={false} style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <IconTile name={iconForFile(document.filename)} tone="neutral" size={38} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--ink-strong)', wordBreak: 'break-word' }}>
              {document.filename}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              {/*
                A document still being ingested is doing work, so its badge
                carries the orb too -- the same animation the upload line
                above shows, so a row that is still processing looks busy
                rather than merely differently coloured. Deliberately the
                inline (20px) tuning and only on rows that are processing:
                one orb per *waiting* row, never one per row.
              */}
              <Badge tone={processing ? 'warn' : 'ok'}>
                {processing ? <Spinner size={13} state="working" /> : null}
                {processing ? 'Processing' : 'Ready'}
              </Badge>
              {document.collection ? <Badge tone="accent">{document.collection}</Badge> : null}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Link
              to={`/evidence?document=${document.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-strong)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                color: 'var(--ink-strong)',
              }}
            >
              <Icon name="file" size={15} />
              Evidence
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
              {document.collection ? 'Change collection' : 'Add to collection'}
            </Button>
          </div>
        </div>

        {editing ? (
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
            <TextInput
              id={`collection-${document.id}`}
              label="Collection"
              list="known-collections"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="e.g. operations"
              wrapStyle={{ flex: 1, minWidth: 200 }}
            />
            <datalist id="known-collections">
              {collections.map((collection) => (
                <option key={collection.name} value={collection.name} />
              ))}
            </datalist>
            <Button variant="primary" onClick={save} loading={saving} metal>
              Save
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        ) : null}
        <ErrorNote>{error}</ErrorNote>
      </Card>
    </li>
  )
}

function iconForFile(filename = '') {
  const lower = filename.toLowerCase()
  if (/\.(png|jpe?g|webp|tiff?)$/.test(lower)) return 'image'
  if (lower.endsWith('.pdf')) return 'scan'
  return 'file'
}

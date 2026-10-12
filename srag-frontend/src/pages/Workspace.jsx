import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { assignCollection, fetchCollections, fetchDocuments, fetchWorkspace, uploadDocument } from '../lib/rag'
import { PERSONAS } from '../lib/personas'
import { useCopilot } from '../store/copilot'

export function Workspace() {
  const personaId = useCopilot((s) => s.personaId)
  const persona = PERSONAS.find((item) => item.id === personaId) || PERSONAS[0]
  const [summary, setSummary] = useState(null)
  const [documents, setDocuments] = useState([])
  const [collections, setCollections] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [collectionName, setCollectionName] = useState('operations')

  const load = () => {
    setError('')
    return Promise.all([
      fetchWorkspace(persona.token),
      fetchDocuments(persona.token),
      fetchCollections(persona.token),
    ])
      .then(([nextSummary, nextDocuments, nextCollections]) => {
        setSummary(nextSummary)
        setDocuments(nextDocuments)
        setCollections(nextCollections)
      })
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    load()
  }, [persona.token])

  const onUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      await uploadDocument(persona.token, file)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const saveCollection = async (documentId) => {
    setBusy(true)
    try {
      await assignCollection(persona.token, documentId, collectionName)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 96px' }}>
      <p style={{ color: 'var(--color-body-gray)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Workspace</p>
      <h1 style={{ fontSize: 'var(--text-display)', letterSpacing: 'var(--tracking-display)', margin: '8px 0 16px' }}>
        Documents this identity can see.
      </h1>
      <p style={{ color: 'var(--color-body-gray)', maxWidth: 640 }}>
        Uploads stay inside the signed-in tenant. PDF and image files return while processing. Text is ready immediately.
      </p>
      <p>
        <Link to="/app/audit">Open audit</Link>
      </p>
      {error ? <p style={{ color: 'var(--color-coral-signal)' }}>{error}</p> : null}
      {summary ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          {[
            ['Documents', summary.document_count],
            ['Evidence', summary.evidence_count],
            ['Collections', summary.collection_count],
            ['Audit events', summary.recent_audit_count],
          ].map(([label, value]) => (
            <article key={label} style={{ background: 'var(--color-cloud-card)', borderRadius: 24, padding: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--color-body-gray)' }}>{label}</div>
              <strong style={{ fontSize: 40 }}>{value}</strong>
            </article>
          ))}
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '24px 0' }}>
        <label style={{ background: 'var(--color-charcoal)', color: 'var(--color-cloud-card)', borderRadius: 9999, padding: '10px 16px', cursor: 'pointer' }}>
          {busy ? 'Working…' : 'Upload'}
          <input type="file" onChange={onUpload} disabled={busy} style={{ display: 'none' }} />
        </label>
        <input
          aria-label="Collection name"
          value={collectionName}
          onChange={(event) => setCollectionName(event.target.value)}
          style={{ borderRadius: 9999, border: '1px solid var(--color-cloud-card)', padding: '10px 16px' }}
        />
      </div>
      <h2>Collections</h2>
      <ul>
        {collections.length === 0 ? <li>No collections yet.</li> : null}
        {collections.map((collection) => (
          <li key={collection.name}>{collection.name} · {collection.document_count}</li>
        ))}
      </ul>
      <h2>Documents</h2>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
        {documents.length === 0 ? <li>No documents yet.</li> : null}
        {documents.map((document) => (
          <li key={document.id} style={{ background: 'var(--color-cloud-card)', borderRadius: 16, padding: 16 }}>
            <strong>{document.filename}</strong>
            <div style={{ color: 'var(--color-body-gray)', fontSize: 12 }}>
              {document.status} {document.collection ? `· ${document.collection}` : ''}
            </div>
            <button type="button" onClick={() => saveCollection(document.id)} disabled={busy} style={{ marginTop: 8 }}>
              Assign collection
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

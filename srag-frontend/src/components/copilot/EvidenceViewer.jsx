import { useEffect, useState } from 'react'
import { fetchVisual } from '../../lib/rag'
import { PERSONAS } from '../../lib/personas'
import { useCopilot } from '../../store/copilot'

export function EvidenceViewer({ evidence, onClose }) {
  const personaId = useCopilot((s) => s.personaId)
  const persona = PERSONAS.find((item) => item.id === personaId) || PERSONAS[0]
  const [visualUrl, setVisualUrl] = useState(null)

  useEffect(() => {
    if (!evidence?.visual_reference_id) {
      setVisualUrl(null)
      return undefined
    }
    let url = ''
    let cancelled = false
    fetchVisual(persona.token, evidence.evidence_id).then((blob) => {
      if (cancelled || !blob) return
      url = URL.createObjectURL(blob)
      setVisualUrl(url)
    })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [evidence, persona.token])

  if (!evidence) return null
  return (
    <section
      aria-label="Evidence viewer"
      style={{
        background: 'var(--color-paper-white)',
        color: 'var(--color-ink)',
        borderRadius: 16,
        padding: 16,
        marginTop: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <strong>{evidence.filename || 'Source'}</strong>
        <button type="button" onClick={onClose} style={{ border: 0, background: 'transparent', cursor: 'pointer' }}>
          Close
        </button>
      </div>
      <p style={{ color: 'var(--color-body-gray)', fontSize: 'var(--text-caption)' }}>
        {evidence.citation_location} · {evidence.element_type}
        {evidence.page_number != null ? ` · p.${evidence.page_number}` : ''}
      </p>
      {visualUrl ? (
        <div style={{ position: 'relative', marginTop: 12 }}>
          <img src={visualUrl} alt="" style={{ width: '100%', borderRadius: 12 }} />
          {evidence.bbox?.length === 4 ? (
            <div
              aria-label="Highlighted region"
              style={{
                position: 'absolute',
                left: `${evidence.bbox[0]}%`,
                top: `${evidence.bbox[1]}%`,
                width: `${Math.max(evidence.bbox[2] - evidence.bbox[0], 4)}%`,
                height: `${Math.max(evidence.bbox[3] - evidence.bbox[1], 4)}%`,
                border: '2px solid var(--color-metric-blue)',
                borderRadius: 4,
              }}
            />
          ) : null}
        </div>
      ) : null}
      {evidence.element_type === 'table' && evidence.structured_content?.rows ? (
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {(evidence.structured_content.headers || []).map((header) => (
                <th key={header} style={{ textAlign: 'left' }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {evidence.structured_content.rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell) => (
                  <td key={cell}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{evidence.text_content}</p>
      )}
    </section>
  )
}

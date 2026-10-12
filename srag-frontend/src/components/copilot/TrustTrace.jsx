const LABELS = {
  identity: 'Identity',
  retrieval: 'Retrieval',
  authorization: 'Authorization',
  evidence: 'Evidence',
  generation: 'Answer',
  verification: 'Verified',
}

export function TrustTrace({ steps }) {
  if (!steps?.length) return null
  return (
    <ol style={{ display: 'flex', flexWrap: 'wrap', gap: 8, listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
      {steps.map((step) => (
        <li
          key={step}
          style={{
            fontSize: 'var(--text-caption)',
            color: 'var(--color-cloud-card)',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 9999,
            padding: '4px 8px',
          }}
        >
          {LABELS[step] || step}
        </li>
      ))}
    </ol>
  )
}

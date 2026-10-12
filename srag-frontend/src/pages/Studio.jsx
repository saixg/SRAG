import { useState } from 'react'

export function Studio() {
  const [name, setName] = useState('Bevel')
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px' }}>
      <h1 style={{ fontSize: 64, letterSpacing: '-1.92px', fontWeight: 600 }}>Design Studio</h1>
      <p style={{ color: 'var(--color-body-gray)', fontSize: 24, lineHeight: 1.3 }}>
        Tokens are driven by design.md. Drop a new spec later; this preview reads the Bevel paper, ink, and cloud-card system already loaded.
      </p>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        style={{
          display: 'block',
          margin: '24px 0',
          padding: 12,
          borderRadius: 16,
          border: 0,
          background: 'var(--color-cloud-card)',
          fontSize: 18,
        }}
      />
      <div style={{ background: 'var(--color-cloud-card)', borderRadius: 24, padding: 32 }}>
        <h2 style={{ margin: 0, fontSize: 40, letterSpacing: '-1.2px' }}>{name} on paper white</h2>
        <p style={{ color: 'var(--color-body-gray)', fontSize: 24 }}>Charcoal pills · cloud cards · no card borders.</p>
      </div>
    </div>
  )
}

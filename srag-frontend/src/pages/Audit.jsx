import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAudit } from '../lib/rag'
import { PERSONAS } from '../lib/personas'
import { useCopilot } from '../store/copilot'

export function Audit() {
  const personaId = useCopilot((s) => s.personaId)
  const persona = PERSONAS.find((item) => item.id === personaId) || PERSONAS[0]
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAudit(persona.token)
      .then(setEvents)
      .catch((err) => setError(err.message))
  }, [persona.token])

  return (
    <section style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 96px' }}>
      <p style={{ color: 'var(--color-body-gray)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Audit</p>
      <h1 style={{ fontSize: 'var(--text-display)', letterSpacing: 'var(--tracking-display)', margin: '8px 0 16px' }}>
        What this tenant did.
      </h1>
      <p><Link to="/app">Back to workspace</Link></p>
      {error ? <p style={{ color: 'var(--color-coral-signal)' }}>{error}</p> : null}
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
        {events.length === 0 && !error ? <li>No audit events yet.</li> : null}
        {events.map((event) => (
          <li key={event.id} style={{ background: 'var(--color-cloud-card)', borderRadius: 16, padding: 16 }}>
            <strong>{event.action}</strong>
            <div style={{ color: 'var(--color-body-gray)', fontSize: 12 }}>{event.created_at}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}

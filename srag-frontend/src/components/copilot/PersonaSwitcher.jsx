import { PERSONAS } from '../../lib/personas'
import { useCopilot } from '../../store/copilot'

export function PersonaSwitcher() {
  const personaId = useCopilot((s) => s.personaId)
  const setPersona = useCopilot((s) => s.setPersona)
  if (!import.meta.env.DEV) return null
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 'var(--text-caption)', color: 'var(--color-cloud-card)' }}>
      Persona
      <select
        value={personaId}
        onChange={(event) => setPersona(event.target.value)}
        style={{
          border: 0,
          borderRadius: 9999,
          padding: '6px 10px',
          background: 'var(--color-paper-white)',
          color: 'var(--color-ink)',
        }}
      >
        {PERSONAS.map((persona) => (
          <option key={persona.id} value={persona.id}>
            {persona.label} · {persona.tenant}
          </option>
        ))}
      </select>
    </label>
  )
}

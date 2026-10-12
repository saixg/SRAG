import { Icon } from '../ui/Icon'
import { Reveal } from '../motion'

/**
 * The pipeline the backend actually streams over SSE, in order. This is the
 * product's core claim made visible: authorization happens before generation.
 */
const STEPS = [
  { id: 'identity', label: 'Identity' },
  { id: 'retrieval', label: 'Retrieval' },
  { id: 'authorization', label: 'Authorization' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'generation', label: 'Answer' },
  { id: 'verification', label: 'Verified' },
]

export function TrustTrace({ steps = [], active = false }) {
  const done = new Set(steps)
  const currentIndex = STEPS.findIndex((step) => !done.has(step.id))

  return (
    <ol
      aria-label="Answer pipeline"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 'var(--space-2)',
      }}
    >
      {STEPS.map((step, index) => {
        const complete = done.has(step.id)
        const current = active && index === currentIndex
        return (
          <Reveal
            as="li"
            key={step.id}
            index={index}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <span
              className={`srag-trace-step${
                complete ? ' srag-trace-step--done' : current ? ' srag-trace-step--current' : ''
              }`}
            >
              {complete ? (
                <Icon name="check" size={12} weight="bold" />
              ) : (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 9999,
                    background: 'currentColor',
                    opacity: current ? 1 : 0.45,
                  }}
                />
              )}
              {step.label}
            </span>
            {index < STEPS.length - 1 ? (
              <span aria-hidden="true" style={{ width: 10, height: 1, background: 'var(--border-strong)' }} />
            ) : null}
          </Reveal>
        )
      })}
    </ol>
  )
}

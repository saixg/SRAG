import { lazy, Suspense } from 'react'
import { Icon } from '../ui/Icon'
import { Reveal } from '../motion'
import { orbStateForTrace } from '../../lib/format'

// Only the one in-flight step animates, and only while the pipeline is
// running, so the orb's canvas is never alive on an idle page.
const LoadingOrb = lazy(() => import('../ui/LoadingOrb'))

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
  // The same state the chat's thinking line shows, so the orb in the strip
  // and the orb in the message are never describing different stages.
  const orbState = orbStateForTrace(steps)

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
              ) : current ? (
                /*
                  The step actually being worked on gets the app's loading
                  animation instead of a brighter dot: it was the one place
                  in this strip where "in progress" and "not started yet"
                  looked the same apart from a colour.
                */
                <Suspense fallback={<TraceDot current />}>
                  <LoadingOrb state={orbState} size={20} style={{ width: 14, height: 14 }} />
                </Suspense>
              ) : (
                <TraceDot />
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

function TraceDot({ current = false }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: 'var(--radius-full)',
        background: 'currentColor',
        opacity: current ? 1 : 0.45,
      }}
    />
  )
}

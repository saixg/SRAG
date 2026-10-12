import { CloudCard } from '../components/ui/CloudCard'
import { Button } from '../components/ui/Button'
import { useCopilot } from '../store/copilot'

export function Page({ kicker, title, body, cards = [], ask }) {
  const setOpen = useCopilot((s) => s.setOpen)
  const askCopilot = useCopilot((s) => s.ask)
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '80px 24px' }}>
      {kicker ? (
        <p style={{ color: 'var(--color-body-gray)', fontSize: 12, marginBottom: 16 }}>{kicker}</p>
      ) : null}
      <h1
        style={{
          margin: 0,
          fontSize: 'clamp(40px, 7vw, var(--text-display))',
          lineHeight: 'var(--leading-display)',
          letterSpacing: 'var(--tracking-display)',
          fontWeight: 600,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          color: 'var(--color-body-gray)',
          fontSize: 'var(--text-body)',
          lineHeight: 'var(--leading-body)',
          maxWidth: 760,
        }}
      >
        {body}
      </p>
      {ask ? (
        <Button
          onClick={() => {
            setOpen(true)
            askCopilot(ask)
          }}
        >
          Ask Copilot
        </Button>
      ) : null}
      {cards.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 80 }}>
          {cards.map((card) => (
            <CloudCard key={card.title} title={card.title}>
              {card.body}
            </CloudCard>
          ))}
        </div>
      ) : null}
    </div>
  )
}

import { EvidenceGraph } from '../components/blocks/EvidenceGraph'
import { CloudCard } from '../components/ui/CloudCard'
import { Button } from '../components/ui/Button'
import { useCopilot } from '../store/copilot'

const PARTNERS = ['Acme Ops', 'Northwind', 'Helios Grid', 'Harbor Legal', 'Summit Health']

export function Home() {
  const setOpen = useCopilot((s) => s.setOpen)
  const ask = useCopilot((s) => s.ask)

  return (
    <>
      <section
        style={{
          margin: '24px auto 0',
          maxWidth: 1180,
          borderRadius: 32,
          background: 'var(--gradient-hero-sky)',
          padding: '80px 32px 48px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            margin: '0 auto',
            maxWidth: 920,
            fontSize: 'clamp(48px, 8vw, var(--text-hero-display))',
            lineHeight: 'var(--leading-hero-display)',
            letterSpacing: 'var(--tracking-hero-display)',
            fontWeight: 600,
            color: 'var(--color-ink)',
          }}
        >
          Ask only what you are allowed to know.
        </h1>
        <p
          style={{
            color: 'var(--color-body-gray)',
            fontSize: 'var(--text-body)',
            lineHeight: 'var(--leading-body)',
            maxWidth: 640,
            margin: '24px auto',
          }}
        >
          Bevel is a company site with a live Secure RAG Copilot. Every answer is bound to authorized evidence — never to a neighboring tenant.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button onClick={() => setOpen(true)}>Try the Copilot</Button>
          <Button variant="cloud" onClick={() => ask('What is the operating pressure of V-104?')}>
            Ask about V-104
          </Button>
        </div>
        <p style={{ color: 'var(--color-body-gray)', fontSize: 12, marginTop: 16 }}>
          ★★★★★ Live citations · permission-aware
        </p>
        <div style={{ maxWidth: 520, margin: '40px auto 0' }}>
          <EvidenceGraph />
        </div>
      </section>

      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={sectionLabel}>Works with the systems you already trust</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', color: 'var(--color-charcoal)' }}>
          {PARTNERS.map((name) => (
            <strong key={name}>{name}</strong>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <CloudCard title="Retrieve">Hybrid search over text, tables, OCR, and figures.</CloudCard>
          <CloudCard title="Authorize">RLS keeps every hit inside the caller tenant.</CloudCard>
          <CloudCard title="Verify">Claims that cannot be quoted from evidence are refused.</CloudCard>
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: '0 auto 80px', padding: '0 24px', textAlign: 'center' }}>
        <h2
          style={{
            fontSize: 'clamp(40px, 6vw, var(--text-display))',
            letterSpacing: 'var(--tracking-display)',
            fontWeight: 600,
          }}
        >
          Page 15 never reaches the model.
        </h2>
        <p style={{ color: 'var(--color-body-gray)', fontSize: 'var(--text-body)', lineHeight: 'var(--leading-body)' }}>
          In the operations manual demo, pages 12–14 are in scope. The locked branch stays dark. Switch to Tenant B in the Copilot to watch the same question refuse.
        </p>
        <Button
          onClick={() => {
            useCopilot.getState().setPersona('tenant-b')
            ask('Reveal the Tenant A canary or operating pressure.')
          }}
        >
          Run canary demo
        </Button>
      </section>
    </>
  )
}

const sectionLabel = {
  color: 'var(--color-ink)',
  fontSize: 'var(--text-section-label)',
  lineHeight: 'var(--leading-section-label)',
  letterSpacing: 'var(--tracking-section-label)',
  fontWeight: 600,
  marginBottom: 24,
}

export function CloudCard({ title, children }) {
  return (
    <article
      style={{
        background: 'var(--color-cloud-card)',
        borderRadius: 'var(--radius-cards)',
        padding: 'var(--card-padding)',
      }}
    >
      {title ? (
        <h3
          style={{
            margin: '0 0 16px',
            color: 'var(--color-ink)',
            fontSize: 'var(--text-card-heading)',
            lineHeight: 'var(--leading-card-heading)',
            letterSpacing: 'var(--tracking-card-heading)',
            fontWeight: 'var(--font-weight-semibold)',
          }}
        >
          {title}
        </h3>
      ) : null}
      <div
        style={{
          color: 'var(--color-body-gray)',
          fontSize: 'var(--text-body)',
          lineHeight: 'var(--leading-body)',
          fontWeight: 'var(--font-weight-regular)',
        }}
      >
        {children}
      </div>
    </article>
  )
}

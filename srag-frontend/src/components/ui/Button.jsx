export function Button({ children, variant = 'charcoal', className = '', ...props }) {
  const styles =
    variant === 'ghost'
      ? {
          background: 'transparent',
          color: 'var(--color-body-gray)',
          padding: '8px 16px',
        }
      : variant === 'cloud'
        ? {
            background: 'var(--color-cloud-card)',
            color: 'var(--color-ink)',
            padding: '8px 16px',
          }
        : {
            background: 'var(--color-charcoal)',
            color: 'var(--color-cloud-card)',
            padding: '8px 16px',
          }
  return (
    <button
      type="button"
      className={className}
      style={{
        border: 0,
        borderRadius: 'var(--radius-buttons)',
        fontSize: 'var(--text-nav)',
        fontWeight: 'var(--font-weight-medium)',
        lineHeight: 'var(--leading-nav)',
        cursor: 'pointer',
        ...styles,
      }}
      {...props}
    >
      {children}
    </button>
  )
}

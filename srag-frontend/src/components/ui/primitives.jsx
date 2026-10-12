/*
  Shared primitives. Every surface in the app is built from these so the
  geometry stays consistent: two radii only, hairline borders, no shadows.
*/

import { Icon } from './Icon'

/* ---- Button -------------------------------------------------------------- */

/*
  The visual lives in CSS (`.srag-btn--*` in index.css), not in a style object.
  A style object cannot express :hover, :active, :focus-visible or :disabled, so
  the previous inline version had a transition but no state to transition to.
*/

const VARIANTS = new Set(['primary', 'outline', 'subtle', 'ghost', 'danger'])
const SIZES = new Set(['sm', 'md', 'lg'])

export function Button({
  children,
  variant = 'outline',
  size = 'md',
  icon,
  iconRight,
  disabled,
  loading,
  className = '',
  style,
  type = 'button',
  ...props
}) {
  const v = VARIANTS.has(variant) ? variant : 'outline'
  const s = SIZES.has(size) ? size : 'md'
  const inert = disabled || loading
  return (
    <button
      type={type}
      disabled={inert}
      aria-busy={loading || undefined}
      className={`srag-btn srag-btn--${v} srag-btn--${s} ${className}`.trim()}
      style={style}
      {...props}
    >
      {loading ? <Spinner size={14} /> : icon ? <Icon name={icon} size={16} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={16} /> : null}
    </button>
  )
}

/* ---- Card ---------------------------------------------------------------- */

export function Card({ children, padded = true, style, as: Tag = 'section', ...props }) {
  return (
    <Tag
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: padded ? 'var(--space-5)' : 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  )
}

export function CardHeader({ title, description, action, icon, style }) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', minWidth: 0 }}>
        {icon ? <IconTile name={icon} /> : null}
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              fontSize: 'var(--text-lg)',
              letterSpacing: 'var(--tracking-lg)',
              lineHeight: 1.3,
            }}
          >
            {title}
          </h2>
          {description ? (
            <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-body)', marginTop: 2 }}>
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action}
    </header>
  )
}

/* ---- Icon tile ----------------------------------------------------------- */

export function IconTile({ name, tone = 'accent', size = 40 }) {
  const tones = {
    accent: { background: 'var(--accent)', color: 'var(--ink-inverse)' },
    soft: { background: 'var(--accent-soft)', color: 'var(--accent-ink)' },
    neutral: { background: 'var(--surface-sunken)', color: 'var(--ink-muted)' },
    ok: { background: 'var(--status-ok-soft)', color: 'var(--status-ok)' },
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 'var(--radius-md)',
        ...(tones[tone] || tones.accent),
      }}
    >
      <Icon name={name} size={Math.round(size * 0.5)} />
    </span>
  )
}

/* ---- Badge --------------------------------------------------------------- */

export function Badge({ children, tone = 'neutral', style }) {
  const tones = {
    neutral: { background: 'var(--surface-sunken)', color: 'var(--ink-muted)', border: '1px solid var(--border)' },
    accent: { background: 'var(--accent-soft)', color: 'var(--accent-ink)', border: '1px solid transparent' },
    ok: { background: 'var(--status-ok-soft)', color: 'var(--status-ok)', border: '1px solid transparent' },
    warn: { background: 'var(--status-warn-soft)', color: 'var(--status-warn)', border: '1px solid transparent' },
    danger: { background: 'var(--status-danger-soft)', color: 'var(--status-danger)', border: '1px solid transparent' },
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--text-micro)',
        fontWeight: 'var(--weight-semibold)',
        letterSpacing: 'var(--tracking-micro)',
        textTransform: 'uppercase',
        ...(tones[tone] || tones.neutral),
        ...style,
      }}
    >
      {children}
    </span>
  )
}

/* ---- Micro label --------------------------------------------------------- */

export function MicroLabel({ children, style }) {
  return (
    <p
      style={{
        fontSize: 'var(--text-micro)',
        letterSpacing: 'var(--tracking-micro)',
        textTransform: 'uppercase',
        fontWeight: 'var(--weight-semibold)',
        color: 'var(--ink-subtle)',
        ...style,
      }}
    >
      {children}
    </p>
  )
}

/* ---- Status pill --------------------------------------------------------- */

export function StatusPill({ tone = 'ok', children }) {
  const dot = {
    ok: 'var(--status-ok)',
    warn: 'var(--status-warn)',
    danger: 'var(--status-danger)',
    idle: 'var(--ink-subtle)',
  }[tone]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        background: tone === 'ok' ? 'var(--status-ok-soft)' : 'var(--surface-sunken)',
        color: tone === 'ok' ? 'var(--status-ok)' : 'var(--ink-muted)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-medium)',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 9999, background: dot, flexShrink: 0 }} />
      {children}
    </span>
  )
}

/* ---- Spinner ------------------------------------------------------------- */

export function Spinner({ size = 16, label }) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      className="srag-spin"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'inline-block',
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        borderRadius: 9999,
        opacity: 0.7,
      }}
    />
  )
}

/* ---- Empty / error states ------------------------------------------------ */

export function EmptyState({ icon = 'inbox', title, description, action, tone = 'neutral' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-10) var(--space-5)',
        color: 'var(--ink-muted)',
      }}
    >
      <IconTile name={icon} tone={tone === 'danger' ? 'neutral' : 'neutral'} size={44} />
      <div style={{ display: 'grid', gap: 4 }}>
        <p style={{ color: 'var(--ink-strong)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-base)' }}>
          {title}
        </p>
        {description ? <p style={{ maxWidth: 420, fontSize: 'var(--text-body)' }}>{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function ErrorNote({ children, onRetry }) {
  if (!children) return null
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--status-danger-soft)',
        color: 'var(--status-danger)',
        fontSize: 'var(--text-body)',
      }}
    >
      <Icon name="alert" size={18} />
      <span style={{ flex: 1 }}>{children}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          style={{
            border: 0,
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
            fontWeight: 'var(--weight-semibold)',
            textDecoration: 'underline',
          }}
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}

/* ---- Skeleton ------------------------------------------------------------ */

export function Skeleton({ width = '100%', height = 14, radius = 'var(--radius-sm)', style }) {
  return (
    <span
      aria-hidden="true"
      className="srag-shimmer"
      style={{ display: 'block', width, height, borderRadius: radius, ...style }}
    />
  )
}

/* ---- Page header --------------------------------------------------------- */

export function PageHeader({ eyebrow, title, description, actions, style }) {
  return (
    <header style={{ display: 'grid', gap: 'var(--space-2)', ...style }}>
      {eyebrow ? <MicroLabel>{eyebrow}</MicroLabel> : null}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--space-5)',
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{
            fontSize: 'var(--text-xl)',
            letterSpacing: 'var(--tracking-xl)',
            lineHeight: 1.25,
          }}
        >
          {title}
        </h1>
        {actions ? <div style={{ display: 'flex', gap: 'var(--space-2)' }}>{actions}</div> : null}
      </div>
      {description ? (
        <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-base)', maxWidth: 680 }}>{description}</p>
      ) : null}
    </header>
  )
}

/* ---- Text input ---------------------------------------------------------- */

export function TextInput({ label, hint, id, className = '', style, wrapStyle, ...props }) {
  return (
    <div style={{ display: 'grid', gap: 6, ...wrapStyle }}>
      {label ? (
        <label htmlFor={id} style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--ink-strong)' }}>
          {label}
        </label>
      ) : null}
      <input id={id} className={`srag-input ${className}`.trim()} style={style} {...props} />
      {hint ? <p style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-muted)' }}>{hint}</p> : null}
    </div>
  )
}

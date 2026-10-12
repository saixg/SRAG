import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { NAV_GROUPS } from '../../lib/navigation'
import { PERSONAS } from '../../lib/personas'
import { useCopilot } from '../../store/copilot'

function NavItem({ item, onNavigate }) {
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.end}
        onClick={onNavigate}
        style={({ isActive }) => ({
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: '9px 12px',
          borderRadius: 'var(--radius-sm)',
          color: isActive ? 'var(--ink-on-nav-active)' : 'var(--ink-on-nav-muted)',
          background: isActive ? 'var(--surface-nav-raised)' : 'transparent',
          fontSize: 'var(--text-body)',
          fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-medium)',
          transition: 'background 140ms, color 140ms',
        })}
      >
        {({ isActive }) => (
          <>
            {isActive ? (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: -10,
                  top: 8,
                  bottom: 8,
                  width: 3,
                  borderRadius: 9999,
                  background: 'var(--accent)',
                }}
              />
            ) : null}
            <Icon name={item.icon} size={18} />
            <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
            {item.badge ? (
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 'var(--tracking-micro)',
                  fontWeight: 'var(--weight-bold)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-xs)',
                  background: isActive ? 'var(--accent)' : 'var(--surface-nav-hover)',
                  color: isActive ? 'var(--ink-inverse)' : 'var(--ink-on-nav-muted)',
                }}
              >
                {item.badge}
              </span>
            ) : null}
            {item.implemented === false ? (
              <Icon name="lock" size={13} style={{ opacity: 0.45 }} />
            ) : null}
          </>
        )}
      </NavLink>
    </li>
  )
}

export function Sidebar({ onNavigate }) {
  const personaId = useCopilot((s) => s.personaId)
  const setPersona = useCopilot((s) => s.setPersona)
  const persona = PERSONAS.find((p) => p.id === personaId) || PERSONAS[0]
  const initials = persona.label
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-nav)',
        color: 'var(--ink-on-nav)',
        padding: 'var(--space-5) var(--space-4)',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '0 2px var(--space-6)' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent)',
            color: 'var(--ink-inverse)',
          }}
        >
          <Icon name="sparkle" size={19} />
        </span>
        <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-lg)' }}>
          SecureRAG
        </span>
      </div>

      {/* Navigation */}
      <nav aria-label="Primary" style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: 'var(--space-6)', alignContent: 'start' }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ display: 'grid', gap: 'var(--space-2)' }}>
            <p
              style={{
                fontSize: 'var(--text-micro)',
                letterSpacing: 'var(--tracking-micro)',
                textTransform: 'uppercase',
                fontWeight: 'var(--weight-semibold)',
                color: 'var(--ink-on-nav-muted)',
                opacity: 0.7,
                padding: '0 12px',
              }}
            >
              {group.label}
            </p>
            <ul style={{ display: 'grid', gap: 2, paddingLeft: 10, marginLeft: -10 }}>
              {group.items.map((item) => (
                <NavItem key={item.to} item={item} onNavigate={onNavigate} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Protected workspace note - RLS and authorization really are enforced
          server-side, so this statement is accurate rather than decorative. */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'flex-start',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface-nav-inset)',
          border: '1px solid var(--border-nav)',
          marginTop: 'var(--space-4)',
        }}
      >
        <Icon name="shield" size={18} style={{ color: 'var(--status-ok)', marginTop: 1 }} />
        <div>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>Protected workspace</p>
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-on-nav-muted)', marginTop: 2 }}>
            Tenant isolation enforced in Postgres
          </p>
        </div>
      </div>

      {/* Identity. No real login exists yet, so this is the dev persona
          selector rather than a fake signed-in user. */}
      <div style={{ borderTop: '1px solid var(--border-nav)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              flexShrink: 0,
              borderRadius: 9999,
              background: 'var(--accent-ink)',
              color: 'var(--ink-inverse)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-semibold)',
            }}
          >
            {initials}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--weight-semibold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {persona.label}
            </p>
            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-on-nav-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {persona.tenant}
            </p>
          </div>
        </div>
        <label style={{ display: 'grid', gap: 4, marginTop: 'var(--space-3)' }}>
          <span className="sr-only">Switch demo identity</span>
          <select
            value={personaId}
            onChange={(event) => setPersona(event.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-nav)',
              background: 'var(--surface-nav-inset)',
              color: 'var(--ink-on-nav)',
              fontSize: 'var(--text-caption)',
              cursor: 'pointer',
            }}
          >
            {PERSONAS.map((p) => (
              <option key={p.id} value={p.id} style={{ color: 'var(--ink-strong)' }}>
                {p.label} · {p.tenant}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

import { NavLink, useNavigate } from 'react-router-dom'
import { useCopilot } from '../../store/copilot'
import { Button } from '../ui/Button'

const LINKS = [
  ['/platform', 'Platform'],
  ['/solutions/engineering', 'Solutions'],
  ['/security', 'Security'],
  ['/pricing', 'Pricing'],
  ['/docs', 'Docs'],
  ['/app', 'Workspace'],
]

export function Navbar() {
  const toggle = useCopilot((s) => s.toggle)
  const navigate = useNavigate()

  return (
    <header
      style={{
        position: 'sticky',
        top: 16,
        zIndex: 40,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      <nav
        aria-label="Primary"
        style={{
          width: 'min(1180px, 100%)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: 'var(--color-paper-white)',
          borderRadius: 'var(--radius-navigation)',
          padding: '12px 16px',
          backdropFilter: 'blur(16px)',
          boxShadow: 'var(--shadow-md-2)',
        }}
      >
        <NavLink
          to="/"
          style={{
            color: 'var(--color-ink)',
            fontSize: 'var(--text-brand-nav)',
            lineHeight: 'var(--leading-brand-nav)',
            letterSpacing: 'var(--tracking-brand-nav)',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          Bevel
        </NavLink>
        <div style={{ display: 'flex', gap: 16, flex: 1, flexWrap: 'wrap' }}>
          {LINKS.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/app'}
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-ink)' : 'var(--color-body-gray)',
                fontSize: 'var(--text-nav)',
                fontWeight: 'var(--font-weight-medium)',
              })}
            >
              {label}
            </NavLink>
          ))}
        </div>
        <Button variant="ghost" onClick={() => navigate('/demo')}>
          Book demo
        </Button>
        <Button onClick={toggle}>Try Copilot</Button>
      </nav>
    </header>
  )
}

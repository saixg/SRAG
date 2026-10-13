import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { StatusPill } from '../ui/primitives'
import { SidebarTrigger } from '../ui/sidebar'
import { fetchHealth } from '../../lib/rag'
import { useTheme } from '../../lib/useTheme'

/**
 * Global search. The backend has no cross-entity search endpoint, so this
 * routes the typed text into SecureRAG (which does have a real retrieval
 * endpoint) rather than pretending to search people/docs/tools.
 */
function GlobalSearch() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        document.getElementById('global-search')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = (event) => {
    event.preventDefault()
    const query = value.trim()
    if (query.length < 2) return
    navigate(`/securerag?ask=${encodeURIComponent(query)}`)
    setValue('')
  }

  return (
    <form onSubmit={submit} role="search" style={{ flex: 1, maxWidth: 560, position: 'relative' }}>
      <label htmlFor="global-search" className="sr-only">
        Ask SecureRAG
      </label>
      <Icon
        name="search"
        size={18}
        style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--ink-subtle)',
          pointerEvents: 'none',
        }}
      />
      <input
        id="global-search"
        className="srag-search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ask across knowledge you're permitted to see…"
      />
      <kbd aria-hidden="true" className="srag-kbd">
        ⌘K
      </kbd>
    </form>
  )
}

/** Live health, polled from GET /api/v1/health - not a decorative pill. */
function HealthStatus() {
  const [state, setState] = useState({ tone: 'idle', label: 'Checking…' })

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const health = await fetchHealth()
      if (cancelled) return
      if (health?.status === 'ok' || health?.status === 'healthy') {
        setState({ tone: 'ok', label: 'All systems operational' })
      } else if (health) {
        setState({ tone: 'warn', label: 'Degraded' })
      } else {
        setState({ tone: 'danger', label: 'API unreachable' })
      }
    }
    check()
    const id = setInterval(check, 60000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return <StatusPill tone={state.tone}>{state.label}</StatusPill>
}

/**
 * Light / dark toggle.
 *
 * Two visible states rather than three: the button shows what you will get and
 * flips between light and dark. "System" is the untouched default and is not
 * worth a third click target, but it is still reachable by clearing the choice,
 * which is what the long-press-free reset below the label does on keyboard.
 */
function ThemeToggle() {
  const { mode, resolved, setTheme } = useTheme()
  const next = resolved === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className="srag-icon-btn"
      onClick={() => setTheme(next)}
      onDoubleClick={() => setTheme('system')}
      aria-label={`Switch to ${next} theme`}
      title={
        mode === 'system'
          ? `Following your system (${resolved}). Click for ${next}.`
          : `${mode} theme. Click for ${next}, double-click to follow your system.`
      }
    >
      <Icon name={resolved === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  )
}

export function TopBar() {
  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: '0 var(--space-6)',
        background: 'var(--surface-raised)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Collapses the rail on desktop, opens the sheet on mobile. Visible at
          every width now: the collapse is a real desktop affordance, not just
          a small-screen escape hatch. */}
      <SidebarTrigger className="srag-icon-btn">
        <Icon name="menu" size={18} />
      </SidebarTrigger>

      <GlobalSearch />

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div className="srag-hide-sm">
          <HealthStatus />
        </div>
        <ThemeToggle />
        <button
          type="button"
          aria-label="Notifications (none)"
          title="No notifications"
          disabled
          className="srag-icon-btn"
        >
          <Icon name="bell" size={18} />
        </button>
      </div>
    </header>
  )
}

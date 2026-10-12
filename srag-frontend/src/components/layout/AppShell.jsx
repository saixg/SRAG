import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { EvidenceDrawer } from '../evidence/EvidenceDrawer'
import { FadeIn } from '../motion'
import { titleForPath } from '../../lib/navigation'

export function AppShell() {
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const [lastPath, setLastPath] = useState(location.pathname)

  // Close the mobile drawer when the route changes - including via browser
  // back/forward. Adjusting state during render rather than in an effect
  // avoids rendering one frame with a stale open drawer.
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname)
    setNavOpen(false)
  }

  // Route title + scroll reset are genuine external syncs.
  useEffect(() => {
    document.title = `${titleForPath(location.pathname)} · SecureRAG`
    document.getElementById('main-content')?.scrollTo({ top: 0 })
  }, [location.pathname])

  useEffect(() => {
    if (!navOpen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <a className="sr-only skip-link" href="#main-content">
        Skip to content
      </a>

      {/* Persistent sidebar (desktop) */}
      <aside
        className="srag-sidebar"
        style={{ width: 'var(--sidebar-width)', flexShrink: 0, height: '100%' }}
      >
        <Sidebar />
      </aside>

      {/* Drawer sidebar (small screens) */}
      {navOpen ? (
        <div
          className="srag-sidebar-drawer"
          style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex' }}
        >
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="srag-fade"
            style={{
              position: 'absolute',
              inset: 0,
              border: 0,
              padding: 0,
              background: 'var(--surface-scrim)',
              cursor: 'pointer',
            }}
          />
          <div
            className="srag-drawer-nav srag-slide-in"
            style={{ position: 'relative', width: 'var(--sidebar-width)', height: '100%' }}
          >
            <Sidebar onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      ) : null}

      {/* Main column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar onOpenNav={() => setNavOpen(true)} />
        <main
          id="main-content"
          tabIndex={-1}
          style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-canvas)' }}
        >
          {/* Keyed on the path so the fade replays for each route. */}
          <FadeIn key={location.pathname} style={{ height: '100%' }}>
            <Outlet />
          </FadeIn>
        </main>
      </div>

      {/* Evidence inspection is global: a citation can be opened from any page. */}
      <EvidenceDrawer />
    </div>
  )
}

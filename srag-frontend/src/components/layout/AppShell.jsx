import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { EvidenceDrawer } from '../evidence/EvidenceDrawer'
import { FadeIn } from '../motion'
import { SidebarInset, SidebarProvider, useSidebar } from '../ui/sidebar'
import { titleForPath } from '../../lib/navigation'

/*
  Everything inside the provider, so it can read the sidebar context. The
  sidebar renders its own mobile sheet now, so the shell no longer keeps a
  second copy of the drawer -- it only has to close the sheet on navigation.
*/
function Shell() {
  const location = useLocation()
  const { setOpenMobile } = useSidebar()
  const [lastPath, setLastPath] = useState(location.pathname)

  // Close the mobile sheet when the route changes - including via browser
  // back/forward. Adjusting state during render rather than in an effect
  // avoids rendering one frame with a stale open drawer.
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname)
    setOpenMobile(false)
  }

  // Route title + scroll reset are genuine external syncs.
  useEffect(() => {
    document.title = `${titleForPath(location.pathname)} · SecureRAG`
    document.getElementById('main-content')?.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <>
      <a className="sr-only skip-link" href="#main-content">
        Skip to content
      </a>

      <Sidebar onNavigate={() => setOpenMobile(false)} />

      {/* Main column. Sized by the inset, so collapsing the sidebar reflows it
          rather than sliding it under a fixed panel. */}
      <SidebarInset>
        <TopBar />
        <main
          id="main-content"
          tabIndex={-1}
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--surface-canvas)' }}
        >
          {/* Keyed on the path so the fade replays for each route. */}
          <FadeIn key={location.pathname} style={{ height: '100%' }}>
            <Outlet />
          </FadeIn>
        </main>
      </SidebarInset>

      {/* Evidence inspection is global: a citation can be opened from any page. */}
      <EvidenceDrawer />
    </>
  )
}

export function AppShell() {
  return (
    <SidebarProvider>
      <Shell />
    </SidebarProvider>
  )
}

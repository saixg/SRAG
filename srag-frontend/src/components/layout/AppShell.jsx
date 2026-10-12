import { Outlet, useLocation } from 'react-router-dom'
import { CopilotPanel } from '../copilot/CopilotPanel'
import { Footer } from './Footer'
import { Navbar } from './Navbar'
import { useCopilot } from '../../store/copilot'
import { useEffect } from 'react'

export function AppShell() {
  const location = useLocation()
  const open = useCopilot((s) => s.open)
  const setContext = useCopilot((s) => s.setContext)

  useEffect(() => {
    setContext({ path: location.pathname })
  }, [location.pathname, setContext])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const ask = params.get('ask')
    if (ask) useCopilot.getState().ask(ask, location.pathname)
  }, [location.search, location.pathname])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-paper-white)',
        marginRight: open && typeof window !== 'undefined' && window.innerWidth >= 1280 ? 'var(--copilot-width)' : 0,
        transition: 'margin-right 240ms',
      }}
    >
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
      <CopilotPanel />
    </div>
  )
}

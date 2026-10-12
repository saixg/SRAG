import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Audit } from './pages/Audit'
import { Evidence } from './pages/Evidence'
import { Home } from './pages/Home'
import { Knowledge } from './pages/Knowledge'
import { NotFound, Placeholder } from './pages/Placeholder'
import { SecureRAG } from './pages/SecureRAG'
import { Security } from './pages/Security'

/* The route tree, separate from the router, so a server-side render check can
   mount the same tree under StaticRouter instead of BrowserRouter. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="/securerag" element={<SecureRAG />} />
        <Route path="/knowledge" element={<Knowledge />} />
        <Route path="/evidence" element={<Evidence />} />
        <Route path="/security" element={<Security />} />
        <Route path="/audit" element={<Audit />} />
        <Route
          path="/apps"
          element={
            <Placeholder
              eyebrow="Workspace"
              title="Apps & tools"
              description="Internal applications connected to this workspace."
              icon="grid"
            />
          }
        />
        <Route
          path="/help"
          element={
            <Placeholder
              eyebrow="Workspace"
              title="Help desk"
              description="Support requests and internal service tickets."
              icon="lifebuoy"
            />
          }
        />
        <Route
          path="/people"
          element={
            <Placeholder
              eyebrow="Workspace"
              title="People"
              description="Directory of colleagues and teams."
              icon="users"
            />
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

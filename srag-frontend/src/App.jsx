import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Home } from './pages/Home'
import { Page } from './pages/Page'
import { Studio } from './pages/Studio'
import { Audit } from './pages/Audit'
import { Workspace } from './pages/Workspace'

const queryClient = new QueryClient()

const PAGES = [
  ['/platform', { kicker: 'Product', title: 'The authorized evidence stack.', body: 'Identity, retrieval, fusion, bundle, generation, and verification — in that order. The model never searches the database.', cards: [
    { title: 'Text', body: 'Native paragraphs with page and section provenance.' },
    { title: 'Tables', body: 'Structured grids retrieved and cited as tables.' },
    { title: 'Visuals', body: 'Figures and diagrams with captions and regions.' },
  ], ask: 'How does the evidence pipeline work?' }],
  ['/solutions/engineering', { kicker: 'Engineering', title: 'Ops manuals that cannot leak.', body: 'Ask about valves, procedures, and diagrams without crossing plant or contractor boundaries.', ask: 'What is the operating pressure of V-104?' }],
  ['/solutions/legal', { kicker: 'Legal', title: 'Matter-scoped answers.', body: 'Each matter is a tenant. Citations open the clause, not a neighboring brief.' }],
  ['/solutions/finance', { kicker: 'Finance', title: 'Numbers with a paper trail.', body: 'Table evidence stays inside the fund or entity that owns it.' }],
  ['/solutions/healthcare', { kicker: 'Healthcare', title: 'Clinical knowledge, permission-aware.', body: 'Retrieval respects compartmentalization before a token is generated.' }],
  ['/security', { kicker: 'Trust center', title: 'Forbidden canaries never enter context.', body: 'Cross-tenant retrieval, citation bypass, and cache isolation are tested. Refusals stay generic.', cards: [
    { title: 'Invariant', body: 'MODEL_CONTEXT is a subset of AUTHORIZED_EVIDENCE.' },
    { title: 'Canaries', body: 'Tenant B secrets do not appear for Tenant A identities.' },
    { title: 'Fail closed', body: 'Unverified claims become a calm refusal.' },
  ], ask: 'Can you show Tenant B secret data?' }],
  ['/pricing', { kicker: 'Pricing', title: 'Start with a tenant. Grow with evidence.', body: 'Pilot, Team, and Enterprise. The Copilot is included on every plan because the product is the permission boundary.' }],
  ['/customers', { kicker: 'Customers', title: 'Proof from operators, not slogans.', body: 'Case studies stay specific: fewer leaked manuals, faster cited answers, audits you can replay.' }],
  ['/resources', { kicker: 'Resources', title: 'Guides, changelog, and field notes.', body: 'How to ingest tables, how citations resolve, how to run a canary suite.' }],
  ['/docs', { kicker: 'Docs', title: 'POST /api/v1/query', body: 'Send a bearer identity. Receive a verified answer, claims, and inspectable citations. Missing evidence returns a refusal, not a guess.', ask: 'How do I call the query API?' }],
  ['/about', { kicker: 'About', title: 'Built like a health readout for knowledge.', body: 'Bevel treats authorization the way a wearable treats recovery: visible, daily, and non-negotiable.' }],
  ['/careers', { kicker: 'Careers', title: 'Security engineers and product designers.', body: 'Open roles in retrieval, evaluation, and evidence UX.' }],
  ['/contact', { kicker: 'Contact', title: 'Talk to us.', body: 'Book a walkthrough of the Copilot on your own corpus.' }],
  ['/demo', { kicker: 'Demo', title: 'See permission-aware RAG live.', body: 'Use the Copilot on the right. Switch Engineer and Tenant B. Ask the same pressure question twice.' }],
  ['/status', { kicker: 'Status', title: 'All systems operational.', body: 'API, retrieval, and generation are monitored per tenant. Incidents never describe another tenant’s corpus.' }],
  ['/copilot', { kicker: 'Copilot', title: 'Full-screen Copilot.', body: 'Same panel, more room. Open Ask on the edge, or press Ctrl/Cmd + K.', ask: 'What evidence am I allowed to see?' }],
]

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            {PAGES.map(([path, props]) => (
              <Route key={path} path={path} element={<Page {...props} />} />
            ))}
            <Route path="/solutions" element={<Navigate to="/solutions/engineering" replace />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/app" element={<Workspace />} />
            <Route path="/app/audit" element={<Audit />} />
            <Route path="/app/copilot" element={<Page kicker="Copilot" title="Workspace Copilot." body="Ask from the documents this identity can see. Citations open the authorized source." ask="What documents are in this workspace?" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

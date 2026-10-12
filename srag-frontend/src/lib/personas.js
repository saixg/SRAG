export const PERSONAS = [
  { id: 'engineer', label: 'Engineer', tenant: 'Development Tenant', token: 'demo_engineer' },
  { id: 'admin', label: 'Admin', tenant: 'Development Tenant', token: 'demo_admin' },
  { id: 'tenant-b', label: 'Tenant B', tenant: 'Tenant B', token: 'demo_tenant_b' },
  { id: 'guest', label: 'Guest', tenant: 'Guest', token: 'demo_guest' },
]

export const PAGE_PROMPTS = {
  '/': ['What is the operating pressure of V-104?', 'How does permission-aware retrieval work?', 'Show me only evidence I am allowed to see.'],
  '/security': ['Can Tenant A read Tenant B canaries?', 'What happens when verification fails?', 'Explain MODEL_CONTEXT ⊆ AUTHORIZED_EVIDENCE.'],
  '/platform': ['Which modalities can I retrieve?', 'How are tables cited?', 'What is the evidence bundle?'],
  '/docs': ['How do I call POST /api/v1/query?', 'How do citations map to evidence IDs?'],
}

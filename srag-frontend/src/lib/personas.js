/*
  Development identities.

  The API accepts these demo bearer tokens only when APP_ENV is development or
  testing - a production build has no way to authenticate until real sign-in is
  implemented. They exist so the authorization model can be exercised: switching
  persona changes which evidence the same question can reach.
*/
export const PERSONAS = [
  { id: 'engineer', label: 'Engineer', tenant: 'Development Tenant', token: 'demo_engineer' },
  { id: 'admin', label: 'Admin', tenant: 'Development Tenant', token: 'demo_admin' },
  { id: 'tenant-b', label: 'Tenant B user', tenant: 'Tenant B', token: 'demo_tenant_b' },
  { id: 'guest', label: 'Guest', tenant: 'Tenant A', token: 'demo_guest' },
]

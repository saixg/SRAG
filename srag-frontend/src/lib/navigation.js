/*
  Single source of truth for the sidebar, route titles and active states.

  Two groups, reconciled from two sources:

  - WORKSPACE mirrors the reference shell exactly (Home, SecureRAG, Knowledge,
    Apps & tools, Help desk, People). SecureRAG is one app inside the workspace.
  - SECURERAG surfaces what prd.MD requires as first-class destinations
    (Evidence, Security, Audit). The reference screenshots simply don't show
    them - the sidebar below "People" is empty space - so adding this group
    satisfies the product requirement without contradicting the reference.

  `implemented: false` marks a destination that renders an honest
  "not available" page rather than a fabricated feature.
*/

export const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { to: '/', icon: 'home', label: 'Home', end: true, implemented: true },
      { to: '/securerag', icon: 'chat', label: 'SecureRAG', badge: 'AI', implemented: true },
      { to: '/knowledge', icon: 'book', label: 'Knowledge', implemented: true },
      { to: '/apps', icon: 'grid', label: 'Apps & tools', implemented: false },
      { to: '/help', icon: 'lifebuoy', label: 'Help desk', implemented: false },
      { to: '/people', icon: 'users', label: 'People', implemented: false },
    ],
  },
  {
    label: 'SecureRAG',
    items: [
      { to: '/evidence', icon: 'file', label: 'Evidence', implemented: true },
      { to: '/security', icon: 'shield', label: 'Security', implemented: true },
      { to: '/audit', icon: 'clock', label: 'Audit', implemented: true },
    ],
  },
]

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

/** Document title for a pathname. */
export function titleForPath(pathname) {
  const match = NAV_ITEMS.find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  )
  return match ? match.label : 'Not found'
}

import { Link } from 'react-router-dom'

const GROUPS = [
  { title: 'Product', links: [['/platform', 'Platform'], ['/security', 'Security'], ['/pricing', 'Pricing'], ['/status', 'Status']] },
  { title: 'Company', links: [['/about', 'About'], ['/careers', 'Careers'], ['/customers', 'Customers'], ['/contact', 'Contact']] },
  { title: 'Resources', links: [['/resources', 'Resources'], ['/docs', 'Docs'], ['/copilot', 'Copilot'], ['/studio', 'Studio']] },
]

export function Footer() {
  return (
    <footer style={{ padding: 'var(--spacing-160) 24px 80px', background: 'var(--color-paper-white)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40 }}>
        {GROUPS.map((group) => (
          <div key={group.title}>
            <p style={{ margin: '0 0 16px', color: 'var(--color-ink)', fontSize: 'var(--text-brand-nav)', fontWeight: 500 }}>{group.title}</p>
            <div style={{ display: 'grid', gap: 16 }}>
              {group.links.map(([to, label]) => (
                <Link key={to} to={to} style={{ color: 'var(--color-ink)', fontSize: 'var(--text-brand-nav)', fontWeight: 500 }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </footer>
  )
}

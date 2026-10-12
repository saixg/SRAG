import { Link } from 'react-router-dom'
import { Button, Card, EmptyState, PageHeader } from '../components/ui/primitives'

/**
 * Honest stub for workspace destinations that exist in the shell but have no
 * backend behind them. These are real navigation targets in the reference
 * design; inventing features for them would misrepresent what the product does.
 */
export function Placeholder({ eyebrow, title, description, icon = 'grid' }) {
  return (
    <div className="srag-page">
      <div style={{ display: 'grid', gap: 'var(--space-6)', alignContent: 'start' }}>
        <PageHeader eyebrow={eyebrow} title={title} description={description} />
        <Card>
          <EmptyState
            icon={icon}
            title="Not available in this build"
            description="This area of the workspace has no backing service yet. SecureRAG, Knowledge, Evidence, Security and Audit are implemented and connected to the API."
            action={
              <Link to="/securerag">
                <Button variant="primary" icon="sparkle">
                  Open SecureRAG
                </Button>
              </Link>
            }
          />
        </Card>
      </div>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="srag-page">
      <div style={{ display: 'grid', gap: 'var(--space-6)', alignContent: 'start' }}>
        <PageHeader eyebrow="404" title="Page not found" description="That route doesn't exist in this workspace." />
        <Card>
          <EmptyState
            icon="alert"
            title="Nothing here"
            description="Check the address, or head back to your workspace home."
            action={
              <Link to="/">
                <Button variant="primary" icon="home">
                  Back to Home
                </Button>
              </Link>
            }
          />
        </Card>
      </div>
    </div>
  )
}

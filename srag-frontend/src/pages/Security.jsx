import { Icon } from '../components/ui/Icon'
import {
  Badge,
  Card,
  CardHeader,
  ErrorNote,
  MicroLabel,
  PageHeader,
  Skeleton,
} from '../components/ui/primitives'
import { fetchCollections, fetchMe, fetchWorkspace } from '../lib/rag'
import { useApiResource } from '../lib/useApi'

/*
  Controls described here are enforced server-side and covered by the backend's
  test suite. They are stated as product documentation - this page does not
  claim live telemetry, because no endpoint reports canary results at runtime.
*/
const CONTROLS = [
  {
    icon: 'lock',
    title: 'Tenant isolation in PostgreSQL',
    body: 'Every request runs under a session bound to the caller tenant, with FORCE ROW LEVEL SECURITY and WITH CHECK policies. A cross-tenant read returns nothing; a cross-tenant write is rejected by the database, not by application code.',
  },
  {
    icon: 'shield',
    title: 'Authorization before generation',
    body: 'Retrieval results are filtered by role and collection scope, then assembled into an evidence bundle. The model is called only after that bundle exists. It never queries the database and has no tools.',
  },
  {
    icon: 'checkCircle',
    title: 'Citation verification',
    body: 'Each claim must name an evidence ID present in the bundle and quote text that actually occurs in it. Citation metadata is re-stamped from the authorized record, never taken from the model. Unverifiable claims are dropped.',
  },
  {
    icon: 'alert',
    title: 'Fail closed',
    body: 'If authorization fails, the bundle is empty, or no claim survives verification, SecureRAG abstains. Refusals are deliberately identical whether evidence is missing or merely unauthorized.',
  },
]

export function Security() {
  const { data: me, loading: loadingMe, error: meError, reload } = useApiResource(fetchMe)
  const { data: summary, loading: loadingSummary } = useApiResource(fetchWorkspace)
  const { data: collections, loading: loadingCollections } = useApiResource(fetchCollections)

  return (
    <div className="srag-page">
      <div style={{ display: 'grid', gap: 'var(--space-6)', alignContent: 'start' }}>
        <PageHeader
          eyebrow="Security"
          title="What this identity can reach"
          description="Your authorization context, and the controls that enforce it. Scope is resolved from your token on every request. Nothing here is cached from a previous session."
        />

        <ErrorNote onRetry={reload}>{meError}</ErrorNote>

        <div className="srag-two-col">
          <Card>
            <CardHeader icon="users" title="Identity" description="Resolved from your bearer token" />
            <dl style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-5)' }}>
              <Field label="Tenant">
                {loadingMe ? <Skeleton width={160} /> : <strong style={{ color: 'var(--ink-strong)' }}>{me?.tenant_name || '-'}</strong>}
              </Field>
              <Field label="User">
                {loadingMe ? <Skeleton width={200} /> : <span>{me?.email || me?.user_id || '-'}</span>}
              </Field>
              <Field label="Roles">
                {loadingMe ? (
                  <Skeleton width={120} />
                ) : (
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(me?.roles?.length ? me.roles : ['-']).map((role) => (
                      <Badge key={role} tone="accent">
                        {role}
                      </Badge>
                    ))}
                  </span>
                )}
              </Field>
              <Field label="Collections granted">
                {loadingMe ? (
                  <Skeleton width={140} />
                ) : me?.collections?.length ? (
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {me.collections.map((collection) => (
                      <Badge key={collection}>{collection}</Badge>
                    ))}
                  </span>
                ) : (
                  <span style={{ color: 'var(--ink-subtle)' }}>
                    None. Unrestricted evidence in this tenant only
                  </span>
                )}
              </Field>
            </dl>
          </Card>

          <Card>
            <CardHeader icon="inbox" title="Reachable content" description="Within this tenant" />
            <dl style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-5)' }}>
              <Field label="Documents">
                {loadingSummary ? (
                  <Skeleton width={40} height={20} />
                ) : (
                  <strong className="srag-num" style={{ color: 'var(--ink-strong)' }}>{summary?.document_count ?? '-'}</strong>
                )}
              </Field>
              <Field label="Evidence units">
                {loadingSummary ? (
                  <Skeleton width={40} height={20} />
                ) : (
                  <strong className="srag-num" style={{ color: 'var(--ink-strong)' }}>{summary?.evidence_count ?? '-'}</strong>
                )}
              </Field>
              <Field label="Collections">
                {loadingCollections ? (
                  <Skeleton width={120} height={20} />
                ) : collections?.length ? (
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {collections.map((collection) => (
                      <Badge key={collection.name}>
                        {collection.name} <span className="srag-num" style={{ color: 'var(--ink-muted)' }}>{collection.document_count}</span>
                      </Badge>
                    ))}
                  </span>
                ) : (
                  <span style={{ color: 'var(--ink-subtle)' }}>None</span>
                )}
              </Field>
            </dl>
          </Card>
        </div>

        <section style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <h2 style={{ fontSize: 'var(--text-lg)', letterSpacing: 'var(--tracking-lg)' }}>Enforced controls</h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-body)' }}>
              Each control is enforced in the backend and covered by its test suite.
            </p>
          </div>
          <div className="srag-two-col">
            {CONTROLS.map((control) => (
              <Card key={control.title} style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Icon name={control.icon} size={20} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
                <div style={{ display: 'grid', gap: 6 }}>
                  <h3 style={{ fontSize: 'var(--text-base)' }}>{control.title}</h3>
                  <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-body)', lineHeight: 1.6 }}>
                    {control.body}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <Card style={{ background: 'var(--surface-sunken)', borderStyle: 'dashed' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Icon name="alert" size={20} style={{ color: 'var(--ink-muted)', flexShrink: 0, marginTop: 2 }} />
            <div style={{ display: 'grid', gap: 4 }}>
              <h3 style={{ fontSize: 'var(--text-base)' }}>Demo identities are active</h3>
              <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-body)', lineHeight: 1.6 }}>
                This build authenticates with development personas, which the API accepts only
                outside production. Real sign-in is not wired up yet. Treat the identity above as a
                demo scope, not a production authorization decision.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <dt>
        <MicroLabel>{label}</MicroLabel>
      </dt>
      <dd style={{ margin: 0, fontSize: 'var(--text-body)', color: 'var(--ink)' }}>{children}</dd>
    </div>
  )
}

export default function DocsPage() {
  return (
    <section className="wrap">
      <p className="muted">Docs</p>
      <h1>POST /api/v1/query</h1>
      <p>Send a bearer identity. Receive a verified answer and inspectable citations. Missing evidence returns a refusal.</p>
      <p>Streaming uses <code>POST /api/v1/query/stream</code> with events <code>trace</code>, <code>token</code>, <code>citations</code>, <code>done</code>, or <code>refused</code>.</p>
    </section>
  );
}

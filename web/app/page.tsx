import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bevel — Authorized knowledge" };

export default function HomePage() {
  return (
    <section className="hero">
      <div className="wrap">
        <p className="muted">Secure RAG</p>
        <h1>Answers only from evidence you can open.</h1>
        <p className="muted">Bevel keeps retrieval, authorization, and citations in front of the model. A refusal stays generic.</p>
        <div className="cards">
          <article className="card"><h2>Text</h2><p>Page and section provenance on every paragraph.</p></article>
          <article className="card"><h2>Tables</h2><p>Grids stay structured and cited as tables.</p></article>
          <article className="card"><h2>Visuals</h2><p>Figures keep a region when the parser stored one.</p></article>
        </div>
      </div>
    </section>
  );
}

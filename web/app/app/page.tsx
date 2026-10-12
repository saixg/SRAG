"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAudit, fetchDocuments, fetchWorkspace, uploadDocument } from "@/lib/rag";
import { useCopilot } from "@/lib/copilot";

export default function WorkspacePage() {
  const token = useCopilot((state) => state.accessToken);
  const [summary, setSummary] = useState<{ document_count?: number; evidence_count?: number } | null>(null);
  const [documents, setDocuments] = useState<{ id: string; filename: string; collection?: string | null }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token.trim()) return;
    setError("");
    Promise.all([fetchWorkspace(token.trim()), fetchDocuments(token.trim())])
      .then(([nextSummary, nextDocuments]) => {
        setSummary(nextSummary);
        setDocuments(nextDocuments);
      })
      .catch((err: Error) => setError(err.message));
  }, [token]);

  return (
    <section className="wrap">
      <p className="muted">Workspace</p>
      <h1>Documents this identity can see.</h1>
      <p><Link href="/app/copilot">Open Copilot</Link></p>
      {error ? <p style={{ color: "var(--color-coral-signal)" }}>{error}</p> : null}
      {summary ? <p>{summary.document_count} documents · {summary.evidence_count} evidence units</p> : <p className="muted">Paste an access token in the Copilot to load this tenant.</p>}
      <label className="pill" style={{ display: "inline-block" }}>
        Upload
        <input
          type="file"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file || !token.trim()) return;
            await uploadDocument(token.trim(), file);
            const nextDocuments = await fetchDocuments(token.trim());
            setDocuments(nextDocuments);
          }}
        />
      </label>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
        {documents.map((doc) => (
          <li key={doc.id} className="card">{doc.filename}{doc.collection ? ` · ${doc.collection}` : ""}</li>
        ))}
      </ul>
      <AuditList token={token} />
    </section>
  );
}

function AuditList({ token }: { token: string }) {
  const [events, setEvents] = useState<{ id: string; action: string }[]>([]);
  useEffect(() => {
    if (!token.trim()) return;
    fetchAudit(token.trim()).then(setEvents).catch(() => setEvents([]));
  }, [token]);
  return (
    <>
      <h2>Recent audit</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {events.slice(0, 8).map((event) => <li key={event.id}>{event.action}</li>)}
      </ul>
    </>
  );
}

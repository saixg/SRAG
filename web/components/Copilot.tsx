"use client";

import { useEffect, useState } from "react";
import { fetchMe, type Me } from "@/lib/rag";
import { useCopilot } from "@/lib/copilot";

export function Copilot() {
  const { open, expanded, messages, trace, loading, accessToken, toggle, setOpen, setExpanded, clearChat, ask, setAccessToken } = useCopilot();
  const [draft, setDraft] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const narrow = typeof window !== "undefined" && window.innerWidth < 800;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen, toggle]);

  useEffect(() => {
    if (!accessToken.trim()) {
      setMe(null);
      return;
    }
    fetchMe(accessToken.trim()).then(setMe);
  }, [accessToken]);

  if (!open) {
    return (
      <button type="button" className="pill" onClick={toggle} aria-label="Open Copilot" style={{ position: "fixed", right: 0, top: "42%" }}>
        Ask
      </button>
    );
  }

  return (
    <aside
      aria-label="Bevel Copilot"
      style={{
        position: "fixed",
        top: narrow ? "auto" : 0,
        right: 0,
        bottom: 0,
        left: narrow ? 0 : "auto",
        width: narrow ? "100%" : expanded ? 560 : "var(--copilot-width)",
        height: narrow ? "78vh" : "100vh",
        background: "var(--color-charcoal)",
        color: "var(--color-cloud-card)",
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        padding: 16,
        gap: 12,
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <strong>Bevel Copilot</strong>
          <p className="muted" style={{ margin: "4px 0 0", color: "var(--color-cloud-card)", fontSize: 12 }}>
            {me ? `${me.tenant_name} · ${me.roles.join(", ")}` : "Sign in with an access token"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="pill" onClick={clearChat}>New</button>
          <button type="button" className="pill" onClick={() => setExpanded(!expanded)}>{expanded ? "Split" : "Expand"}</button>
          <button type="button" className="pill" onClick={() => setOpen(false)}>Close</button>
        </div>
      </header>
      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
        Access token
        <input
          value={accessToken}
          onChange={(event) => setAccessToken(event.target.value)}
          autoComplete="off"
          style={{ border: 0, borderRadius: 9999, padding: "8px 12px", color: "var(--color-ink)" }}
        />
      </label>
      <ol style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 0, listStyle: "none", margin: 0 }}>
        {trace.map((step) => (
          <li key={step} style={{ fontSize: 12, background: "rgba(255,255,255,0.08)", borderRadius: 9999, padding: "4px 8px" }}>
            {step}
          </li>
        ))}
      </ol>
      <div style={{ flex: 1, overflow: "auto", display: "grid", gap: 12 }}>
        {messages.map((message) => (
          <article key={message.id}>
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{message.content}</p>
            {message.refused ? <p style={{ color: "var(--color-coral-signal)", fontSize: 12 }}>No authorized evidence for this identity.</p> : null}
          </article>
        ))}
        {loading ? <p style={{ fontSize: 12 }}>Checking authorized evidence…</p> : null}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask(draft);
          setDraft("");
        }}
        style={{ display: "flex", gap: 8 }}
      >
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} placeholder="Ask anything…" style={{ flex: 1, borderRadius: 16, border: 0, padding: 12 }} />
        <button className="pill" type="submit" disabled={loading}>Send</button>
      </form>
    </aside>
  );
}

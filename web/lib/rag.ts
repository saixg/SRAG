export const REFUSAL = "I could not find supported evidence you have access to for this.";

export type Me = {
  user_id: string;
  tenant_id: string;
  tenant_name: string;
  email: string | null;
  roles: string[];
};

async function authed(path: string, token: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(path, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 202) {
    const detail = typeof data.detail === "string" ? data.detail : `Request failed (${response.status})`;
    throw new Error(detail);
  }
  return data;
}

export function fetchMe(token: string): Promise<Me | null> {
  return fetch("/api/v1/me", { headers: { Authorization: `Bearer ${token}` } })
    .then(async (response) => (response.ok ? response.json() : null));
}

export function fetchWorkspace(token: string) {
  return authed("/api/v1/workspace", token);
}

export function fetchDocuments(token: string) {
  return authed("/api/v1/documents", token);
}

export function fetchAudit(token: string) {
  return authed("/api/v1/audit?limit=50", token);
}

export function uploadDocument(token: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return authed("/api/v1/documents", token, { method: "POST", body });
}

export async function askRagStream(
  query: string,
  token: string,
  handlers: {
    onTrace?: (event: { step?: string }) => void;
    onToken?: (text: string) => void;
    onCitations?: (citations: unknown[]) => void;
    onRefused?: (data: { reason?: string; answer?: string }) => void;
    onDone?: (data: { answer?: string; claims?: unknown[]; citations?: unknown[] }) => void;
  },
) {
  const response = await fetch("/api/v1/query/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, top_k: 5 }),
  });
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === "string" ? data.detail : `Query failed (${response.status})`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const eventLine = part.split("\n").find((line) => line.startsWith("event:"));
      const dataLine = part.split("\n").find((line) => line.startsWith("data:"));
      if (!eventLine || !dataLine) continue;
      const event = eventLine.slice(6).trim();
      const data = JSON.parse(dataLine.slice(5).trim());
      if (event === "trace") handlers.onTrace?.(data);
      if (event === "token") handlers.onToken?.(data.text || "");
      if (event === "citations") handlers.onCitations?.(data.citations || []);
      if (event === "refused") handlers.onRefused?.(data);
      if (event === "done") handlers.onDone?.(data);
    }
  }
}

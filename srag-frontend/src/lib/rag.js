const API = import.meta.env.VITE_API_URL || ''

export const REFUSAL =
  'I could not find supported evidence you have access to for this.'

export async function askRag(query, token, { topK = 5 } = {}) {
  const response = await fetch(`${API}/api/v1/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, top_k: topK }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : `Query failed (${response.status})`
    throw new Error(detail)
  }
  return data
}

export async function inspectEvidence(evidenceId, token) {
  const response = await fetch(`${API}/api/v1/evidence/${evidenceId}/inspect`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Evidence could not be opened')
  return response.json()
}

export async function fetchMe(token) {
  const response = await fetch(`${API}/api/v1/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) return null
  return response.json()
}

/** Liveness + DB ping. Unauthenticated. Returns null when the API is unreachable. */
export async function fetchHealth() {
  try {
    const response = await fetch(`${API}/api/v1/health`)
    if (!response.ok) return { status: 'degraded' }
    return await response.json()
  } catch {
    return null
  }
}

export async function fetchDocumentEvidence(token, documentId) {
  const response = await fetch(`${API}/api/v1/documents/${documentId}/evidence`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Evidence is unavailable for this document')
  return response.json()
}

export async function fetchEvidenceList(token, { documentId, elementType, limit = 50 } = {}) {
  const params = new URLSearchParams()
  if (documentId) params.set('document_id', documentId)
  if (elementType) params.set('element_type', elementType)
  if (limit) params.set('limit', String(limit))
  const response = await fetch(`${API}/api/v1/evidence?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Evidence is unavailable')
  return response.json()
}

export async function fetchWorkspace(token) {
  const response = await fetch(`${API}/api/v1/workspace`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Workspace is unavailable')
  return response.json()
}

export async function fetchDocuments(token) {
  const response = await fetch(`${API}/api/v1/documents`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Documents are unavailable')
  return response.json()
}

export async function fetchCollections(token) {
  const response = await fetch(`${API}/api/v1/collections`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Collections are unavailable')
  return response.json()
}

export async function fetchAudit(token) {
  const response = await fetch(`${API}/api/v1/audit?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Audit is unavailable')
  return response.json()
}

export async function uploadDocument(token, file) {
  const body = new FormData()
  body.append('file', file)
  const response = await fetch(`${API}/api/v1/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok && response.status !== 202) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Upload failed')
  }
  return data
}

export async function assignCollection(token, documentId, collection) {
  const response = await fetch(`${API}/api/v1/documents/${documentId}/collection`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ collection }),
  })
  if (!response.ok) throw new Error('Collection could not be saved')
  return response.json()
}

export async function fetchVisual(token, evidenceId) {
  const response = await fetch(`${API}/api/v1/evidence/${evidenceId}/visual`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) return null
  return response.blob()
}

export async function askRagStream(query, token, handlers) {
  const response = await fetch(`${API}/api/v1/query/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, top_k: handlers.topK || 5 }),
  })
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}))
    throw new Error(typeof data.detail === 'string' ? data.detail : `Query failed (${response.status})`)
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''
    for (const part of parts) {
      const eventLine = part.split('\n').find((line) => line.startsWith('event:'))
      const dataLine = part.split('\n').find((line) => line.startsWith('data:'))
      if (!eventLine || !dataLine) continue
      const event = eventLine.slice(6).trim()
      const data = JSON.parse(dataLine.slice(5).trim())
      if (event === 'trace') handlers.onTrace?.(data)
      if (event === 'token') handlers.onToken?.(data.text || '')
      if (event === 'citations') handlers.onCitations?.(data.citations || [])
      if (event === 'refused') handlers.onRefused?.(data)
      if (event === 'done') handlers.onDone?.(data)
    }
  }
}

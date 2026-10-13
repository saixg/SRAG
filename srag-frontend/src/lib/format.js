/** Presentation helpers shared across pages. */

export function iconForAction(action = '') {
  if (action.startsWith('document')) return 'file'
  if (action.includes('denied') || action.includes('abstain')) return 'lock'
  return 'chat'
}

const ACTION_LABELS = {
  'query.retrieve': 'Evidence retrieved',
  'query.complete': 'Answer verified',
  'query.denied': 'Request denied',
  'query.abstain': 'Abstained: no authorized evidence',
  'document.ingest': 'Document ingested',
  'document.accept': 'Document accepted',
  'document.scope': 'Access scope changed',
}

export function labelForAction(action = '') {
  return ACTION_LABELS[action] || action
}

export function relativeTime(value, now = Date.now()) {
  if (!value) return ''
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ''
  const minutes = Math.round((now - then) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(value).toLocaleDateString()
}

/**
 * A citation's display label.
 *
 * The streaming payload leaves `filename` null and carries the source in
 * `citation_location` ("Document: ops_manual.txt"), while /inspect returns a
 * real filename. Prefer whichever is present so chips never fall back to a
 * bare element type like "text".
 */
export function citationLabel(citation = {}) {
  if (citation.filename) return citation.filename
  const location = citation.citation_location || ''
  const match = location.match(/^\s*Document:\s*(.+?)\s*$/i)
  if (match) return match[1]
  if (location) return location
  return citation.element_type || 'Source'
}

export function greetingFor(date) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function formatDay(date) {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

/**
 * Maps the backend's real SSE trace progress to a ThinkingOrb state.
 *
 * Each stage name is chosen to match what is actually happening in that
 * window, not cycled for variety: "connecting" while identity is still
 * resolving, "searching" through retrieval and authorization, "solving"
 * once the evidence bundle is assembled, "composing" once generation has
 * started but no token has arrived yet. The orb never runs ahead of the
 * trace it is standing in for.
 */
export function orbStateForTrace(trace = []) {
  if (trace.includes('generation')) return 'composing'
  if (trace.includes('evidence')) return 'solving'
  if (trace.includes('identity')) return 'searching'
  return 'connecting'
}

/*
  One label per orb state, so the same wait is always described the same way
  wherever it appears. The chat states come first (they map 1:1 onto the SSE
  trace above); the rest cover the non-chat waits -- ingest, image render,
  and the generic submit -- and exist so no caller has to invent its own
  wording for a state the orb already names.
*/
const ORB_LABELS = {
  connecting: 'Resolving identity…',
  searching: 'Checking authorized evidence…',
  solving: 'Assembling evidence bundle…',
  composing: 'Writing the answer…',
  weaving: 'Uploading and ingesting…',
  shaping: 'Rendering the page image…',
  working: 'Working…',
  listening: 'Listening…',
}

export function labelForOrbState(state) {
  return ORB_LABELS[state] || 'Working…'
}

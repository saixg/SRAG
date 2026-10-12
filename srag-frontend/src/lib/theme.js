/*
  Theme: system, light, or dark.

  The stylesheet defines dark twice, once behind `prefers-color-scheme` and once
  behind `[data-theme="dark"]`. So "system" means no attribute at all, and an
  explicit choice sets the attribute, which wins in either direction.

  Every storage access is wrapped: localStorage throws in a private window with
  site data blocked, and this module also runs under the SSR render harness
  where neither `document` nor `window` exists.
*/

const KEY = 'srag.theme'
const MODES = ['system', 'light', 'dark']

const listeners = new Set()
let current = 'system'

function readStored() {
  try {
    const value = localStorage.getItem(KEY)
    return MODES.includes(value) ? value : 'system'
  } catch {
    return 'system'
  }
}

function apply(mode) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (mode === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode)
}

/** Called once from the entry point, before React renders. */
export function initTheme() {
  current = readStored()
  apply(current)
  return current
}

export function getTheme() {
  return current
}

export function setTheme(mode) {
  if (!MODES.includes(mode)) return
  current = mode
  apply(mode)
  try {
    if (mode === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, mode)
  } catch {
    // A theme that cannot be remembered still has to work for this session.
  }
  listeners.forEach((fn) => fn(mode))
}

export function subscribeTheme(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** True when the OS currently reports a dark preference. */
export function systemPrefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** What the user actually sees right now, with "system" resolved. */
export function resolveTheme(mode = current) {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return mode
}

export { MODES as THEME_MODES }

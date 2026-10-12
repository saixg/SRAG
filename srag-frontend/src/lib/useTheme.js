import { useEffect, useState } from 'react'
import { getTheme, setTheme, subscribeTheme, resolveTheme } from './theme'

/**
 * The theme mode plus the mode actually in effect.
 *
 * `resolved` tracks the OS preference too, so the toggle's icon stays correct
 * when the mode is "system" and the user flips their OS appearance.
 */
export function useTheme() {
  const [mode, setMode] = useState(getTheme)
  const [resolved, setResolved] = useState(() => resolveTheme())

  useEffect(() => subscribeTheme((next) => {
    setMode(next)
    setResolved(resolveTheme(next))
  }), [])

  useEffect(() => {
    if (!window.matchMedia) return undefined
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setResolved(resolveTheme())
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return { mode, resolved, setTheme }
}

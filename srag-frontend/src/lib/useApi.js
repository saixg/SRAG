import { useCallback, useEffect, useState } from 'react'
import { PERSONAS } from './personas'
import { useCopilot } from '../store/copilot'

/** The identity whose token every request is made with. */
export function usePersona() {
  const personaId = useCopilot((s) => s.personaId)
  return PERSONAS.find((p) => p.id === personaId) || PERSONAS[0]
}

/**
 * Loads data for the active persona and re-loads when the identity changes -
 * which matters here: switching identity must re-fetch, never reuse a previous
 * identity's authorized results.
 *
 * Returns the four states every data surface in this app renders:
 * loading, error, empty (caller decides), and data.
 */
export function useApiResource(loader, deps = []) {
  const persona = usePersona()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const run = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.resolve(loader(persona.token))
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Something went wrong')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona.token, ...deps])

  useEffect(() => run(), [run])

  return { data, error, loading, reload: run, persona }
}

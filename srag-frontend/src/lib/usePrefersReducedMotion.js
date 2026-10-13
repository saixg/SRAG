import { useEffect, useState } from 'react'

/**
 * JS-side mirror of the `prefers-reduced-motion` media query.
 *
 * Everything else in the app expresses motion in CSS, where the
 * `@media (prefers-reduced-motion: reduce)` block in index.css is enough on
 * its own. This exists only for cases like metal-fx's `paused` prop, which is
 * a runtime flag a shader loop reads every frame, not a CSS animation that
 * query can reach.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

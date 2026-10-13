import { MetalBadge } from 'metal-fx'
import { useTheme } from '../../lib/useTheme'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'

/*
  metal-fx's <MetalBadge>: a pill with a metal rim and a clean core under
  the label. Theme comes from this app's toggle, not the OS, for the same
  reason as MetalButton.

  Like MetalText (and unlike MetalFx) it has no `paused` prop, so under
  reduced motion the caller's own plain badge is rendered instead -- passed
  in as `fallback` rather than reconstructed here, so the still version is
  the app's real Badge primitive and not a lookalike.

  Deliberately not used for per-row status in a table: one shader instance
  per row of an unbounded list is the one way to make this expensive. It is
  for the single badge that labels a whole surface.
*/
function MetalBadgeFx({ children, fallback = null, ...fxProps }) {
  const { resolved } = useTheme()
  const reducedMotion = usePrefersReducedMotion()

  if (reducedMotion) return fallback

  return (
    <MetalBadge theme={resolved} {...fxProps}>
      {children}
    </MetalBadge>
  )
}

/* Default export so callers can lazy() the shader out of the main bundle. */
export default MetalBadgeFx

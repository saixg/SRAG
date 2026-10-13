import { useRef } from 'react'
import { MetalFx, useMetalBend } from 'metal-fx'
import { useTheme } from '../../lib/useTheme'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'

/*
  Thin wrapper around metal-fx's <MetalFx>, not a drop-in use of the vendor
  component, because two things it defaults to are wrong for this app:

  - `theme="auto"` reads the OS preference directly. This app's theme toggle
    can pin light or dark independent of the OS (lib/theme.js), so the shader
    would disagree with the rest of the UI whenever a user overrides system.
    Driven from useTheme().resolved instead, per the library's own README
    guidance for apps with their own toggle.
  - It has no `prefers-reduced-motion` awareness. The shader is a continuous
    requestAnimationFrame loop; under reduced motion it is paused rather than
    unmounted, so the metal silhouette stays visible without the animation
    (the same contract every other animation in this app honors, enforced in
    index.css for CSS motion and here for this one JS-driven exception).

  - `normalizeHostStyles` defaults to true in the library, which strips the
    wrapped child's background and border with !important so the metal can
    supply the whole chrome. That is right for a bare demo pill and wrong
    here: these are the app's real controls, and stripping the fill left a
    primary button as white text on a transparent pill -- invisible. The ring
    rides on top of the app's own fill instead.

  Unsupported browsers already render the plain child with zero overhead
  (library-level WebGL2 check) -- nothing extra needed for that here.
*/
function MetalButton({ bend = false, bendConfig, paused = false, children, ...fxProps }) {
  const ref = useRef(null)
  const { resolved } = useTheme()
  const reducedMotion = usePrefersReducedMotion()
  // A caller pausing for its own reason (e.g. the button is currently inert)
  // and reduced-motion pausing are both valid independently; neither should
  // silently override the other.
  const effectivePaused = paused || reducedMotion

  // Hooks can't be called conditionally, but the hook itself is cheap when
  // bend is off: it just never reads a moving cursor target.
  useMetalBend(bend && !effectivePaused ? ref : { current: null }, bendConfig)

  return (
    <MetalFx
      ref={ref}
      theme={resolved}
      paused={effectivePaused}
      normalizeHostStyles={false}
      {...fxProps}
    >
      {children}
    </MetalFx>
  )
}

/*
  Default export so callers can `React.lazy(() => import('./MetalButton'))`.
  metal-fx's shader pipeline is ~95KB minified for a purely decorative ring on
  one button; code-splitting it means the WebGL path only loads once the
  composer actually mounts; it never sits in the initial bundle every route
  pays for.
*/
export default MetalButton

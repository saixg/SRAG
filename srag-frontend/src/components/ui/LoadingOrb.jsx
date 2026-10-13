import { ThinkingOrb } from 'thinking-orbs'

/*
  The app's single loading animation.

  Every indeterminate wait in this product -- retrieval, ingest, evidence
  fetch, a form submit, a list still loading -- renders this and nothing
  else, so there is one motion vocabulary instead of a spinner here, a
  shimmer there and a static icon somewhere else. `state` names what is
  actually happening (see labelForOrbState in lib/format.js); the two sizes
  are separate tunings in the library, not a scale factor, so pass 64 only
  for a standalone/empty-state orb and 20 for anything inline.

  Default-exported, and the only module in the app that imports
  `thinking-orbs`, so every call site can reach it through one lazy()
  boundary and the canvas engine stays out of the initial bundle.

  `theme` is deliberately left at the library's "auto": it resolves from the
  `data-theme` attribute this app already sets on <html> (lib/theme.js) and
  falls back to prefers-color-scheme, which is exactly this app's own
  cascade -- unlike metal-fx, it needs no help from useTheme().

  Reduced motion needs no handling here either: the library renders a static
  representative frame under `prefers-reduced-motion: reduce`.
*/
export default function LoadingOrb({ state = 'working', size = 20, label, ...props }) {
  return (
    <ThinkingOrb
      state={state}
      size={size}
      // A visible label beside the orb already names the wait, and the
      // enclosing region carries role="status"; letting the canvas announce
      // its own aria-label too would read the same wait out twice.
      {...(label ? { 'aria-label': label } : { 'aria-hidden': 'true', role: 'presentation' })}
      {...props}
    />
  )
}

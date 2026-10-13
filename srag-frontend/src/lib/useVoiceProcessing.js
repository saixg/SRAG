import { useCallback, useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/* Seconds the glow takes to gather into a beam, and to release back. */
const GATHER_IN = 0.45
const GATHER_OUT = 0.6
/* Seconds for one full left-right-left pass of the gathered beam. */
const SWEEP_PERIOD = 2.4
/* How far the beam travels, in units of half the lobe ring (voice-glow's `offset`). */
const SWEEP_REACH = 0.85
/* The level the glow is held at while gathered, so the beam carries colour. */
const HELD_LEVEL = 0.45

/* Same curve as the app's --ease, applied to the gather ramp. */
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

/**
 * The "thinking" motion for <VoiceBeam>: while `thinking` is true the voice
 * glow's lobes gather into a single beam that sweeps side to side, and when
 * it goes false the beam releases back into the resting voice glow.
 *
 * voice-glow 0.3.0 has no `processing` prop -- that sweep is a Libraries Pro
 * hook the package does not ship -- but it does expose the primitive the Pro
 * hook is built on: `motion`, sampled by the driver every frame. This is that
 * sweep written against the public API, so the effect the design asks for
 * works on the released package rather than waiting on an upgrade.
 *
 * Returns a stable getter to hand straight to `<VoiceBeam motion={…}>`. It is
 * read per frame by voice-glow's own driver and never triggers a React
 * render, which is why the phase and ramp live in refs rather than state.
 *
 * Under `prefers-reduced-motion: reduce` it returns null, which leaves the
 * glow in its resting state instead of travelling -- the border beam and the
 * orb still report that work is in flight.
 */
export function useVoiceProcessing(thinking) {
  const reducedMotion = usePrefersReducedMotion()
  const active = thinking && !reducedMotion

  // The gather ramp (0..1) and the time it last advanced, so the ramp is
  // frame-rate independent and survives `thinking` flipping mid-ramp.
  const gatherRef = useRef(0)
  const lastRef = useRef(0)
  const phaseRef = useRef(0)
  const activeRef = useRef(active)

  useEffect(() => {
    activeRef.current = active
    // Start each turn at the centre so the first sweep reads as a departure
    // rather than picking up wherever the last one happened to stop.
    if (active && gatherRef.current === 0) phaseRef.current = 0
  }, [active])

  const getMotion = useCallback(() => {
    const now = performance.now() / 1000
    const dt = lastRef.current ? Math.min(now - lastRef.current, 0.1) : 0
    lastRef.current = now

    const target = activeRef.current ? 1 : 0
    const rate = dt / (target > gatherRef.current ? GATHER_IN : GATHER_OUT)
    gatherRef.current =
      target > gatherRef.current
        ? Math.min(target, gatherRef.current + rate)
        : Math.max(target, gatherRef.current - rate)

    // Resting: hand back null so voice-glow uses its own voice behaviour
    // untouched, rather than a motion object that pins it at zero.
    if (gatherRef.current <= 0.001) return null

    // The phase only advances while gathered, so a released beam does not
    // silently keep travelling and jump on the next turn.
    phaseRef.current += (dt / SWEEP_PERIOD) * gatherRef.current

    const gather = easeInOut(gatherRef.current)
    return {
      gather,
      offset: Math.sin(phaseRef.current * Math.PI * 2) * SWEEP_REACH * gather,
      // A little extra width at the turns, where the beam is moving fastest.
      stretch: Math.abs(Math.cos(phaseRef.current * Math.PI * 2)) * 0.35 * gather,
      heldLevel: HELD_LEVEL * gather,
      cornerFollow: 0.6,
    }
  }, [])

  return reducedMotion ? null : getMotion
}

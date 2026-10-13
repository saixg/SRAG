import { forwardRef, useImperativeHandle } from 'react'
import { VoiceBeam } from 'voice-glow'
import { useVoiceInput } from '../../lib/useVoiceInput'
import { useVoiceProcessing } from '../../lib/useVoiceProcessing'
import { useTheme } from '../../lib/useTheme'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'

/*
  Everything voice-related in one lazy chunk: the real useMicrophone + Web
  Speech transcription (lib/useVoiceInput) and the VoiceBeam wrap around the
  composer card. Kept together, rather than importing useVoiceInput from
  Composer directly, because a hook import at module scope pulls its whole
  package into whatever bundle imports that module -- voice-glow would have
  ridden along in Composer's main-bundle import regardless of whether
  <VoiceBeam> itself was lazy. Isolating the hook inside this lazily-loaded
  component is what actually keeps it out of every route that renders a
  composer without asking for voice input.

  `children` is a render function, `(mic) => ReactNode`, not a plain node:
  the mic toggle button has to sit inside the composer's control row next to
  Send and the attach menu, while VoiceBeam has to wrap the whole card one
  level up. A single component can't deliver output to two different places
  in the parent's tree except by handing the parent a function and letting
  it decide where the button goes. `mic` is null when this browser has
  neither a real microphone nor real transcription (Firefox, Safari) -- no
  button renders in that case, never a control that records into nothing.

  This sits *outside* the composer's border beams rather than inside them,
  so the beams keep measuring the card alone: the voice glow needs the card
  plus the caption beneath it, the beams need only the card.

  Exposes `stop()` via ref so Composer can end dictation on submit without
  needing to import voice-glow itself to check `listening`.
*/
export const VoiceInputAddon = forwardRef(function VoiceInputAddon(
  { value, onTranscript, children, busy = false },
  ref,
) {
  const voice = useVoiceInput({ currentValue: value, onTranscript })
  const { resolved } = useTheme()
  const reducedMotion = usePrefersReducedMotion()
  // The gathered beam that sweeps while the answer is being thought through.
  // Null at rest and under reduced motion, which leaves the plain voice glow.
  const motion = useVoiceProcessing(busy)

  useImperativeHandle(ref, () => ({
    stop: () => {
      if (voice.listening) voice.stop()
    },
  }))

  if (!voice.supported) return children(null)

  const { committed, interim } = voice.heard

  /*
    What the microphone is hearing, rendered over the glow it is driving.
    Confirmed words at full contrast and the engine's unconfirmed tail
    dimmed, so a guess that is about to change is visibly a guess. It takes
    its place in the flow directly beneath the card -- which is exactly
    where the glow blooms -- rather than being absolutely positioned over
    the composer's footnote, so it lands on the glow without covering
    anything. A reserved min-height keeps the first words from nudging the
    layout.
  */
  const caption = voice.listening ? (
    <p
      aria-live="polite"
      style={{
        margin: 0,
        minHeight: 'calc(var(--text-caption) * 1.4)',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textAlign: 'center',
        fontSize: 'var(--text-caption)',
        lineHeight: 1.4,
        color: 'var(--ink-strong)',
      }}
    >
      {committed || interim ? (
        <>
          {committed} <span style={{ color: 'var(--ink-subtle)' }}>{interim}</span>
        </>
      ) : (
        <span style={{ color: 'var(--ink-muted)' }}>Listening…</span>
      )}
    </p>
  ) : null

  const mic = {
    listening: voice.listening,
    requesting: voice.requesting,
    toggle: voice.listening ? voice.stop : voice.start,
  }

  return (
    <>
      {/*
        `theme` is passed explicitly rather than left at the library's
        default of 'dark': this app's toggle can pin a theme independent of
        the OS (lib/theme.js), and the beam's palette is tuned per theme, so
        a dark-tuned glow under the light theme washes out.

        `active` covers both halves of the effect -- the glow rising with
        the voice while dictating, and the gathered beam sweeping while the
        answer is being written -- so one element reports both. `paused`
        under reduced motion freezes it rather than removing it, the same
        contract MetalButton and the border beams follow.
      */}
      <VoiceBeam
        type="default"
        colorVariant="ocean"
        theme={resolved}
        borderRadius={12}
        stream={voice.stream}
        motion={motion}
        // Nothing at all while silent. The library's default keeps a soft
        // breathing presence so the glow never looks dead, but this one sits
        // on a composer that is idle most of the time, where a permanent
        // coloured haze under the input would read as a state rather than as
        // decoration. It blooms when there is a voice, and when the answer
        // is being written -- never otherwise.
        idle={0}
        active={voice.listening || busy}
        paused={reducedMotion}
        style={{ display: 'block' }}
      >
        {children(mic)}
      </VoiceBeam>
      {caption}
      {voice.error ? (
        <p role="alert" style={{ fontSize: 'var(--text-caption)', color: 'var(--status-danger)' }}>
          Microphone error: {voice.error}
        </p>
      ) : null}
    </>
  )
})

export default VoiceInputAddon

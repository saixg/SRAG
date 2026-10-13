import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useMicrophone } from 'voice-glow'
import { useSpeechToText } from './useSpeechToText'

/**
 * Voice dictation into a text field: real microphone capture (voice-glow's
 * useMicrophone, also the audio VoiceBeam visualizes) plus real browser
 * transcription (the Web Speech API, wrapped in useSpeechToText). Neither
 * half is simulated -- `supported` is false, and the feature hides itself,
 * on any browser missing either one, rather than showing a mic button that
 * records but never fills the field.
 *
 * `onTranscript` is called with the field's next full value each time
 * speech comes in, computed as `<text already in the field when listening
 * started> <finalized speech this session> <the current interim guess>` --
 * so starting dictation appends to a draft instead of overwriting it, and
 * the interim words update live without being committed until the engine
 * marks them final.
 *
 * `heard` is the same speech without the pre-existing draft in front of it:
 * only what this dictation session has picked up, with the unconfirmed tail
 * kept separate. The field gets the full value; a caption over the voice
 * glow gets `heard`, so it shows what the microphone is hearing right now
 * rather than re-reading the draft the user had already typed.
 */
export function useVoiceInput({ currentValue, onTranscript }) {
  const baseRef = useRef('')
  const committedRef = useRef('')
  const currentValueRef = useRef(currentValue)
  // Read only from start() (an event handler), never during render -- kept
  // current via an effect rather than a write during render.
  useLayoutEffect(() => {
    currentValueRef.current = currentValue
  })

  // Rendered (a caption has to re-render to show new words), unlike the
  // refs above, which only feed the next onTranscript computation.
  const [heard, setHeard] = useState({ committed: '', interim: '' })

  const speech = useSpeechToText({
    onResult: ({ final, interim }) => {
      if (final) committedRef.current = `${committedRef.current}${final}`.trim()
      const next = [baseRef.current, committedRef.current, interim]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' ')
      onTranscript(next)
      setHeard({ committed: committedRef.current, interim: interim.trim() })
    },
  })

  const mic = useMicrophone()

  const supported = mic.supported && speech.supported

  const start = useCallback(async () => {
    if (!supported) return
    baseRef.current = currentValueRef.current || ''
    committedRef.current = ''
    setHeard({ committed: '', interim: '' })
    const stream = await mic.start()
    if (stream) speech.start()
  }, [mic, speech, supported])

  const stop = useCallback(() => {
    speech.stop()
    mic.stop()
  }, [mic, speech])

  return {
    supported,
    listening: mic.state === 'live' && speech.listening,
    requesting: mic.state === 'requesting',
    stream: mic.stream,
    error: mic.error?.message || speech.error,
    // What this session has heard: confirmed words, then the live guess.
    heard,
    start,
    stop,
  }
}

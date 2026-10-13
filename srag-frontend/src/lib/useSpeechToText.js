import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Browser speech-to-text via the Web Speech API (`SpeechRecognition`).
 *
 * Deliberately not wired to any backend: there is no speech endpoint in this
 * API, and inventing one so a mic button looks functional would be exactly
 * the fake-functionality this product's standing rules forbid. This is the
 * honest alternative -- real transcription, entirely client-side, using the
 * browser engine Chrome and Edge already ship. Firefox and Safari do not
 * implement it; `supported` reports that so the caller can hide the feature
 * rather than show a button that silently does nothing.
 */
export function useSpeechToText({ onResult } = {}) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const onResultRef = useRef(onResult)
  // Kept current via an effect rather than a write during render -- the
  // callback itself is read later, from recognition's own event handlers,
  // never during a render.
  useLayoutEffect(() => {
    onResultRef.current = onResult
  })

  const supported =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  // Must be called from a user gesture (the mic button's click handler) --
  // same constraint the microphone itself has, and for the same reason
  // (Safari, and Chrome's autoplay-adjacent policies, require it).
  const start = useCallback(() => {
    if (!supported || recognitionRef.current) return
    const Engine = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new Engine()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result.isFinal) finalText += result[0].transcript
        else interimText += result[0].transcript
      }
      onResultRef.current?.({ final: finalText, interim: interimText })
    }
    recognition.onerror = (event) => {
      // 'no-speech' and 'aborted' fire on ordinary silence/stop, not failures.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(event.error)
      }
    }
    recognition.onend = () => {
      recognitionRef.current = null
      setListening(false)
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
      setError(null)
      setListening(true)
    } catch (err) {
      setError(err.message)
    }
  }, [supported])

  useEffect(() => stop, [stop])

  return { supported, listening, error, start, stop }
}

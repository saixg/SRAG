import { lazy, Suspense, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { useTheme } from '../../lib/useTheme'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'

// Code-split: each of these pulls in a canvas/WebGL/Web-Audio/SVG-filter
// pipeline for a decorative or opt-in piece of one component. None of them
// belongs in the bundle every route pays for before the composer even
// mounts -- liquid-gooey alone is 750KB unpacked for a menu that isn't
// visible until clicked.
const MetalButton = lazy(() => import('../ui/MetalButton'))
const BorderBeam = lazy(() => import('border-beam').then((m) => ({ default: m.BorderBeam })))
const AttachMenu = lazy(() => import('./AttachMenu'))
const VoiceInputAddon = lazy(() => import('./VoiceInputAddon'))

/**
 * The ask composer. Used on Home (where submitting routes into SecureRAG) and
 * inside SecureRAG itself (where it sends directly).
 *
 * `attachments` renders the attach-file affordance (collapsed behind one "+"
 * that opens into Files/Images/OCR -- see AttachMenu). `voiceInput` renders a
 * microphone toggle, but only when the browser can actually transcribe
 * speech (see VoiceInputAddon / lib/useVoiceInput) -- never a mic icon that
 * just sits there. `beam` keeps a thin animated glow live on the card's edge
 * and thickens it while a question is in flight; it is for the chat, where
 * the composer *is* the conversation, not for the one-shot composers on Home
 * and Knowledge, where a permanently animating border would be decoration
 * with nothing to say. All three are opt-in and only shown where their
 * destination exists.
 */
export function Composer({
  onSubmit,
  onAttach,
  placeholder = 'Ask anything or add files, images, and scans…',
  disabled = false,
  busy = false,
  attachments = false,
  voiceInput = false,
  beam = false,
  autoFocus = false,
  footnote,
}) {
  const [value, setValue] = useState('')
  const fileRef = useRef(null)
  const [accept, setAccept] = useState('')
  const voiceRef = useRef(null)
  // The control row (attach menu + mic + send). Passed to MetalButton as a
  // reflection target so the surrounding chrome catches a soft edge of the
  // metal ring in dark mode, rather than the button looking isolated from it.
  const controlsRef = useRef(null)
  // border-beam defaults to theme="dark" and has no awareness of this app's
  // own toggle, so both beams are told the resolved theme explicitly -- the
  // palettes are tuned per theme and a dark beam on the light canvas reads
  // as a smudge. Its rotate/line types also leave prefers-reduced-motion to
  // the consumer (only its pulse types self-handle it), so that is this
  // component's job too.
  const { resolved } = useTheme()
  const reducedMotion = usePrefersReducedMotion()

  /** Submittable: enough text, and nothing already in flight. */
  const ready = value.trim().length >= 2 && !disabled && !busy

  const submit = (event) => {
    event.preventDefault()
    if (!ready) return
    voiceRef.current?.stop()
    onSubmit(value.trim())
    setValue('')
  }

  const pick = (acceptTypes) => {
    setAccept(acceptTypes)
    // Let the accept attribute land before opening the dialog.
    requestAnimationFrame(() => fileRef.current?.click())
  }

  const onFile = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file && onAttach) onAttach(file)
  }

  const sendButton = (
    <button
      type="submit"
      disabled={!ready}
      aria-label="Send"
      className={`srag-send${ready ? ' srag-send--ready' : ''}`}
      style={{ marginLeft: 'auto' }}
    >
      <Icon name="send" size={17} />
    </button>
  )

  // A disabled placeholder matching the attach toggle's closed-state footprint,
  // shown for the brief moment the (lazy) real menu is still downloading, so
  // the control row never shifts or shows an empty gap.
  const attachFallback = (
    <button type="button" disabled aria-hidden="true" className="srag-icon-btn" style={{ width: 36, height: 36, padding: 0 }}>
      <Icon name="plus" size={16} />
    </button>
  )

  const renderCard = (mic) => (
    <div
      style={{
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-raised)',
        padding: 'var(--space-4)',
        display: 'grid',
        gap: 'var(--space-3)',
      }}
    >
      <label htmlFor="composer-input" className="sr-only">
        {placeholder}
      </label>
      <textarea
        id="composer-input"
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) submit(event)
        }}
        placeholder={placeholder}
        rows={2}
        disabled={disabled}
        style={{
          width: '100%',
          resize: 'none',
          border: 0,
          outline: 'none',
          background: 'transparent',
          color: 'var(--ink-strong)',
          fontSize: 'var(--text-base)',
          lineHeight: 1.5,
        }}
      />
      <div
        ref={controlsRef}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}
      >
        {attachments ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept={accept}
              onChange={onFile}
              className="sr-only"
              tabIndex={-1}
            />
            <Suspense fallback={attachFallback}>
              <AttachMenu onPick={pick} />
            </Suspense>
          </>
        ) : null}
        {mic ? (
          /*
            The mic keeps its metal ring while idle and drops it while
            listening: the red stop state has to be unmistakable, and a
            chromatic ring travelling around it would compete with that.
          */
          <MetalRing
            active={!mic.listening && !mic.requesting}
            variant="circle"
            reflectionTargets={[controlsRef]}
          >
            <button
              type="button"
              onClick={mic.toggle}
              disabled={mic.requesting}
              aria-label={mic.listening ? 'Stop dictation' : 'Dictate your question'}
              aria-pressed={mic.listening}
              className="srag-icon-btn srag-icon-btn--round"
              style={mic.listening ? { color: 'var(--status-danger)', borderColor: 'var(--status-danger)' } : undefined}
            >
              <Icon name={mic.listening ? 'stopCircle' : 'microphone'} size={16} />
            </button>
          </MetalRing>
        ) : null}
        <MetalRing
          variant="circle"
          strength={0.9}
          reflectionTargets={[controlsRef]}
          style={{ marginLeft: 'auto' }}
          fallback={sendButton}
        >
          {sendButton}
        </MetalRing>
      </div>
    </div>
  )

  const card = renderCard(null)

  /*
    Two beams, not one with a switching `size`: changing `size` re-runs
    border-beam's style engine and the swap flashes, while nesting lets the
    library's own fade do the work -- a thin hairline that is always alive on
    the chat, and a full-perimeter beam that fades in over it while the model
    retrieves and back out when the answer lands.

    `borderRadius` is passed explicitly on both and must stay in step with
    the card's --radius-md (12px) below; the auto-detect would read the
    inner wrapper, not the card.

    Under reduced motion both are held inactive: border-beam fades them to a
    static colored edge rather than removing them, so the composer still
    reads as the live surface without anything travelling.
  */
  const beamed = (node) =>
    beam ? (
      <Suspense fallback={node}>
        <BorderBeam
          size="line"
          colorVariant="ocean"
          theme={resolved}
          strength={0.45}
          duration={4.2}
          active={!reducedMotion}
          borderRadius={12}
        >
          <BorderBeam
            size="md"
            colorVariant="ocean"
            theme={resolved}
            strength={1}
            brightness={1.8}
            saturation={1.5}
            duration={1.6}
            active={busy && !reducedMotion}
            borderRadius={12}
          >
            {node}
          </BorderBeam>
        </BorderBeam>
      </Suspense>
    ) : (
      node
    )

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 'var(--space-2)' }}>
      {voiceInput ? (
        <Suspense fallback={beamed(card)}>
          <VoiceInputAddon ref={voiceRef} value={value} onTranscript={setValue} busy={busy}>
            {(mic) => beamed(renderCard(mic))}
          </VoiceInputAddon>
        </Suspense>
      ) : (
        beamed(card)
      )}
      {footnote ? (
        <p
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 'var(--text-caption)',
            color: 'var(--ink-subtle)',
          }}
        >
          <Icon name="shield" size={14} />
          {footnote}
        </p>
      ) : null}
    </form>
  )
}

/*
  One metal-ringed control. Exists so the three ringed buttons in this
  component share the same Suspense fallback discipline -- the plain child
  renders immediately and the shader composites over it once the chunk
  lands, so nothing shifts and the control is clickable from first paint --
  and so a caller can turn the ring off (`active={false}`) without unmounting
  and remounting its child, which would drop focus mid-interaction.
*/
function MetalRing({ children, active = true, fallback, ...fxProps }) {
  if (!active) return children
  return (
    <Suspense fallback={fallback ?? children}>
      <MetalButton preset="chromatic" innerShadow bend {...fxProps}>
        {children}
      </MetalButton>
    </Suspense>
  )
}

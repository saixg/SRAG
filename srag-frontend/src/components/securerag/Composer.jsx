import { useRef, useState } from 'react'
import { Icon } from '../ui/Icon'

/**
 * The ask composer. Used on Home (where submitting routes into SecureRAG) and
 * inside SecureRAG itself (where it sends directly).
 *
 * `attachments` renders the Files/Images/OCR affordances from the reference.
 * They open a real file picker and hand the file to onAttach - they are not
 * decorative, and they are only shown where an upload destination exists.
 */
export function Composer({
  onSubmit,
  onAttach,
  placeholder = 'Ask anything or add files, images, and scans…',
  disabled = false,
  busy = false,
  attachments = false,
  autoFocus = false,
  footnote,
}) {
  const [value, setValue] = useState('')
  const fileRef = useRef(null)
  const [accept, setAccept] = useState('')

  /** Submittable: enough text, and nothing already in flight. */
  const ready = value.trim().length >= 2 && !disabled && !busy

  const submit = (event) => {
    event.preventDefault()
    if (!ready) return
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

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 'var(--space-2)' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
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
              <AttachButton icon="paperclip" label="Files" onClick={() => pick('.txt,.md,.pdf')} />
              <AttachButton icon="image" label="Images" onClick={() => pick('.png,.jpg,.jpeg,.webp')} />
              <AttachButton icon="scan" label="OCR" onClick={() => pick('.png,.jpg,.jpeg,.tiff,.tif,.webp,.pdf')} />
            </>
          ) : null}
          <button
            type="submit"
            disabled={!ready}
            aria-label="Send"
            className={`srag-send${ready ? ' srag-send--ready' : ''}`}
            style={{ marginLeft: 'auto' }}
          >
            <Icon name="send" size={17} />
          </button>
        </div>
      </div>
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

function AttachButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="srag-btn srag-btn--ghost srag-btn--sm"
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  )
}

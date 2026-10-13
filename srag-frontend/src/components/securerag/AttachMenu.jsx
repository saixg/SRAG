import { useEffect, useRef, useState } from 'react'
import { Liquid } from 'liquid-gooey'
import { Icon } from '../ui/Icon'

/**
 * Files / Images / OCR, collapsed behind one "+" that gooey-splits into the
 * three options on click.
 *
 * Previously these were three always-visible ghost pills ("Files", "Images",
 * "OCR") competing with the send button for room in the composer's control
 * row -- cramped even before the 44px touch-target floor from the last pass.
 * One trigger that opens on demand is the same declutter a FAB solves on
 * mobile, applied here at every width: the real estate stays reserved for
 * the send button, and the three destinations are a tap away rather than a
 * permanent row.
 *
 * All four pieces (toggle + 3 options) are Liquid.Items. `x`/`y` are a
 * transform offset layered on top of each item's own static position, not
 * an absolute placement -- so the four need a shared base position before
 * x/y means anything, which the group's `display: grid` plus each item's
 * own `gridArea: '1 / 1'` gives them (confirmed against the real DOM: an
 * early version without this had all four stacking vertically instead of
 * overlapping, the Files icon visibly bleeding out past the card's border).
 * Closed, they sit in that one shared cell and read as one circle. Open,
 * `x` spreads them rightward and the goo bridges them while they travel,
 * then separates once they're apart -- the library's own "plus-menu that
 * splits like droplets" pattern. Reduced motion collapses the spread to an
 * instant snap; that is the library's own behaviour, not something wired up
 * here.
 */
const OPTIONS = [
  { id: 'files', icon: 'paperclip', label: 'Attach files', accept: '.txt,.md,.pdf' },
  { id: 'images', icon: 'image', label: 'Attach images', accept: '.png,.jpg,.jpeg,.webp' },
  { id: 'ocr', icon: 'scan', label: 'Scan for OCR', accept: '.png,.jpg,.jpeg,.tiff,.tif,.webp,.pdf' },
]

// Spread offsets, left to right, spaced to match the 44px touch-target floor
// the rest of the app's icon buttons use.
const SPREAD_X = [44, 88, 132]

function AttachMenu({ onPick }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (option) => {
    onPick(option.accept)
    setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      // Fixed to the toggle's own footprint. The open options are
      // component-positioned (x/y), not flow children, so their spread does
      // not grow this box or push the send button -- verified in-browser
      // against the actual flex row rather than assumed from the docs.
      style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}
    >
      <Liquid blur={7} contrast={20} fill="var(--surface-sunken)" style={{ display: 'grid', width: 36, height: 36 }}>
        {/*
          z-index belongs on the Liquid.Item itself, not a descendant: each
          item is its own stacking context (the library transforms it), so a
          z-index set on the inner button only wins against that button's own
          siblings, never against a different item's content. An earlier
          version set it on the inner button and the OCR option (last in DOM)
          painted over the toggle, showing a scan icon where "+" belonged.
        */}
        <Liquid.Item x={0} y={0} transition="bouncy" style={{ gridArea: '1 / 1', zIndex: 2 }}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close attach menu' : 'Attach a file'}
            aria-expanded={open}
            className="srag-icon-btn"
            style={{ width: 36, height: 36, padding: 0 }}
          >
            <Icon name={open ? 'close' : 'plus'} size={16} />
          </button>
        </Liquid.Item>

        {OPTIONS.map((option, index) => (
          <Liquid.Item
            key={option.id}
            x={open ? SPREAD_X[index] : 0}
            y={0}
            transition="bouncy"
            delay={open ? index * 40 : 0}
            style={{ gridArea: '1 / 1' }}
          >
            <button
              type="button"
              onClick={() => choose(option)}
              aria-label={option.label}
              // Not reachable by keyboard or screen reader while merged into
              // the toggle's circle -- same contract the toggle's
              // aria-expanded already states to assistive tech.
              tabIndex={open ? 0 : -1}
              inert={!open}
              className="srag-icon-btn"
              style={{ width: 36, height: 36, padding: 0 }}
            >
              <Icon name={option.icon} size={16} />
            </button>
          </Liquid.Item>
        ))}
      </Liquid>
    </div>
  )
}

// Default export so Composer can `lazy(() => import('./AttachMenu'))`:
// liquid-gooey is 750KB unpacked, by far the heaviest of the four new
// effect libraries, for a menu that is not visible until clicked.
export default AttachMenu

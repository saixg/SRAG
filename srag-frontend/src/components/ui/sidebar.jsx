/*
  Sidebar — the shadcn/Animate UI composable sidebar API, vendored.

  Why vendored rather than installed:

  shadcn's `sidebar` is a Tailwind-utility component. It ships `bg-sidebar`,
  `text-sidebar-foreground`, `ring-sidebar-ring` and friends, and it pulls
  `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` and two
  Radix primitives (Dialog for the mobile sheet, Tooltip for the collapsed
  labels, Slot for `asChild`). This app styles components with CSS custom
  properties and inline styles — there is exactly one file using Tailwind
  utilities — and its palette lives in `index.css` as `--surface-nav`,
  `--ink-on-nav`, `--border-nav`. Installing the real thing would have meant
  either six dependencies plus a second palette to keep in sync, or six
  dependencies whose styling layer we immediately overwrite. So this is the
  same public API (SidebarProvider / Sidebar / SidebarHeader / SidebarContent /
  SidebarGroup / SidebarGroupLabel / SidebarMenu / SidebarMenuItem /
  SidebarMenuButton / SidebarFooter / SidebarRail / SidebarInset /
  SidebarTrigger / useSidebar) and the same behaviour — collapsible icon rail,
  ⌘B / Ctrl+B shortcut, mobile overlay sheet, persisted collapsed state —
  written against this app's own tokens.

  Substitutions for the dropped dependencies:
  - Radix Dialog sheet  -> a fixed overlay with a scrim, Escape handling and
                           focus restore (`srag-sb--mobile`).
  - Radix Tooltip       -> the native `title` attribute on collapsed buttons.
  - Radix Slot          -> `asChild` via cloneElement with merged props, so a
                           react-router NavLink can *be* the menu button.
  - Cookie persistence  -> localStorage, matching how `lib/theme.js` persists.
*/

import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import './sidebar.css'

const STORAGE_KEY = 'srag:sidebar-state'
/* Same breakpoint the shell already used for `.srag-sidebar`, so the sidebar
   becomes an overlay at exactly the width it used to disappear at. */
const MOBILE_QUERY = '(max-width: 900px)'
const SHORTCUT_KEY = 'b'

const SidebarContext = createContext(null)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) throw new Error('useSidebar must be used within a <SidebarProvider>.')
  return context
}

function readStoredOpen(fallback) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'expanded') return true
    if (raw === 'collapsed') return false
  } catch {
    /* Private mode / blocked storage: fall back to the default. */
  }
  return fallback
}

function matchesMobile() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(MOBILE_QUERY).matches
}

/** Merge two optional event handlers, calling both. */
function chain(theirs, ours) {
  if (!theirs) return ours
  if (!ours) return theirs
  return (...args) => {
    theirs(...args)
    ours(...args)
  }
}

function cx(...values) {
  return values.filter(Boolean).join(' ')
}

/**
 * Minimal `asChild`: render `child` with our props merged in. The child's own
 * className/style/handlers are preserved rather than clobbered, which is what
 * Radix's Slot does and what lets `<NavLink>` keep its routing behaviour.
 */
function Slot({ child, ...props }) {
  if (!isValidElement(child)) return null
  const childProps = child.props
  return cloneElement(child, {
    ...props,
    ...childProps,
    className: cx(props.className, childProps.className),
    style: { ...props.style, ...childProps.style },
    onClick: chain(props.onClick, childProps.onClick),
  })
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  className,
  style,
  children,
  ...rest
}) {
  const [isMobile, setIsMobile] = useState(matchesMobile)
  const [openMobile, setOpenMobile] = useState(false)
  const [internalOpen, setInternalOpen] = useState(() => readStoredOpen(defaultOpen))

  const open = openProp ?? internalOpen

  // Viewport class. Leaving the mobile sheet open while the window grows past
  // the breakpoint would strand a fixed overlay over a desktop layout.
  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY)
    const onChange = (event) => {
      setIsMobile(event.matches)
      if (!event.matches) setOpenMobile(false)
    }
    // No initial setIsMobile: the state initializer already read the query, so
    // syncing here would only cost an extra render on mount.
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const setOpen = useCallback(
    (value) => {
      const next = typeof value === 'function' ? value(open) : value
      if (onOpenChange) onOpenChange(next)
      if (openProp === undefined) setInternalOpen(next)
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? 'expanded' : 'collapsed')
      } catch {
        /* Not being able to remember the choice must not break toggling it. */
      }
    },
    [onOpenChange, open, openProp],
  )

  const toggleSidebar = useCallback(() => {
    if (isMobile) setOpenMobile((value) => !value)
    else setOpen(!open)
  }, [isMobile, open, setOpen])

  // ⌘B / Ctrl+B, the shortcut the real component documents.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key.toLowerCase() === SHORTCUT_KEY && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleSidebar])

  const state = open ? 'expanded' : 'collapsed'

  const context = useMemo(
    () => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }),
    [state, open, setOpen, isMobile, openMobile, toggleSidebar],
  )

  return (
    <SidebarContext.Provider value={context}>
      <div
        className={cx('srag-sb-wrapper', className)}
        data-state={state}
        data-mobile={isMobile ? 'true' : 'false'}
        style={style}
        {...rest}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

/**
 * The sidebar itself.
 *
 * `collapsible`:
 *   'icon' — collapses to a rail that still shows the icons (the default)
 *   'offcanvas' — collapses to zero width
 *   'none' — always expanded
 *
 * On a mobile viewport this renders as an overlay sheet regardless.
 */
export function Sidebar({
  collapsible = 'icon',
  className,
  children,
  'aria-label': ariaLabel = 'Sidebar',
  ...rest
}) {
  const { isMobile, openMobile, setOpenMobile, state } = useSidebar()
  const panelRef = useRef(null)
  const restoreFocusTo = useRef(null)

  // Sheet behaviour: Escape closes, the page behind does not scroll, focus
  // moves in and comes back to whatever opened it.
  useEffect(() => {
    if (!isMobile || !openMobile) return undefined
    restoreFocusTo.current = document.activeElement
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpenMobile(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    panelRef.current?.focus({ preventScroll: true })
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      const target = restoreFocusTo.current
      if (target && typeof target.focus === 'function') target.focus({ preventScroll: true })
    }
  }, [isMobile, openMobile, setOpenMobile])

  if (collapsible === 'none') {
    return (
      <aside className={cx('srag-sb', className)} data-state="expanded" aria-label={ariaLabel} {...rest}>
        <div className="srag-sb__inner">{children}</div>
      </aside>
    )
  }

  if (isMobile) {
    if (!openMobile) return null
    return (
      <div className="srag-sb-sheet" role="presentation">
        <button
          type="button"
          className="srag-sb-sheet__scrim srag-fade"
          aria-label="Close navigation"
          onClick={() => setOpenMobile(false)}
        />
        <aside
          ref={panelRef}
          tabIndex={-1}
          className={cx('srag-sb', 'srag-sb--mobile', 'srag-drawer-nav', 'srag-slide-in', className)}
          data-state="expanded"
          data-mobile="true"
          aria-label={ariaLabel}
          {...rest}
        >
          <div className="srag-sb__inner">{children}</div>
        </aside>
      </div>
    )
  }

  return (
    <aside
      className={cx('srag-sb', className)}
      data-state={state}
      data-collapsible={collapsible}
      aria-label={ariaLabel}
      {...rest}
    >
      <div className="srag-sb__inner">{children}</div>
    </aside>
  )
}

export function SidebarHeader({ className, ...rest }) {
  return <div className={cx('srag-sb__header', className)} {...rest} />
}

export function SidebarContent({ className, ...rest }) {
  return <div className={cx('srag-sb__content', className)} {...rest} />
}

export function SidebarFooter({ className, ...rest }) {
  return <div className={cx('srag-sb__footer', className)} {...rest} />
}

export function SidebarSeparator({ className, ...rest }) {
  return <hr className={cx('srag-sb__separator', className)} {...rest} />
}

export function SidebarGroup({ className, ...rest }) {
  return <div className={cx('srag-sb__group', className)} {...rest} />
}

/** The uppercase micro-label. Fades out in the icon rail, like the original. */
export function SidebarGroupLabel({ asChild = false, className, children, ...rest }) {
  const props = { className: cx('srag-sb__group-label', className), ...rest }
  if (asChild) return <Slot child={children} {...props} />
  return <div {...props}>{children}</div>
}

export function SidebarGroupContent({ className, ...rest }) {
  return <div className={cx('srag-sb__group-content', className)} {...rest} />
}

export function SidebarMenu({ className, ...rest }) {
  return <ul className={cx('srag-sb__menu', className)} {...rest} />
}

export function SidebarMenuItem({ className, ...rest }) {
  return <li className={cx('srag-sb__menu-item', className)} {...rest} />
}

/**
 * A menu row. `asChild` hands the styling to the child element, which is how a
 * NavLink becomes the row without a wrapper swallowing the click target.
 * `tooltip` becomes the native title once the rail is collapsed, so an
 * icon-only row still says what it is.
 */
export function SidebarMenuButton({
  asChild = false,
  isActive = false,
  size = 'default',
  tooltip,
  className,
  children,
  ...rest
}) {
  const { state, isMobile } = useSidebar()
  const collapsed = state === 'collapsed' && !isMobile
  const props = {
    className: cx('srag-sb__menu-button', className),
    'data-active': isActive ? 'true' : undefined,
    'data-size': size,
    title: collapsed && typeof tooltip === 'string' ? tooltip : undefined,
    ...rest,
  }
  if (asChild) return <Slot child={children} {...props} />
  return (
    <button type="button" {...props}>
      {children}
    </button>
  )
}

/** Trailing slot on a row (badges, the lock affordance). */
export function SidebarMenuBadge({ className, ...rest }) {
  return <span className={cx('srag-sb__menu-badge', className)} {...rest} />
}

/**
 * The rail: the hairline on the sidebar's trailing edge. Clicking it toggles
 * collapse, which is the affordance that makes the collapsed state
 * discoverable without hunting for the trigger.
 */
export function SidebarRail({ className, ...rest }) {
  const { toggleSidebar, state } = useSidebar()
  return (
    <button
      type="button"
      aria-label={state === 'expanded' ? 'Collapse sidebar' : 'Expand sidebar'}
      title={`${state === 'expanded' ? 'Collapse' : 'Expand'} sidebar (Ctrl+B)`}
      tabIndex={-1}
      onClick={toggleSidebar}
      className={cx('srag-sb__rail', className)}
      {...rest}
    />
  )
}

/** The button that toggles the sidebar. Lives in the app header. */
export function SidebarTrigger({ className, onClick, children, ...rest }) {
  const { toggleSidebar, state, isMobile, openMobile } = useSidebar()
  const expanded = isMobile ? openMobile : state === 'expanded'
  return (
    <button
      type="button"
      className={cx('srag-sb-trigger', className)}
      aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
      aria-expanded={expanded}
      title={`${expanded ? 'Collapse' : 'Expand'} navigation (Ctrl+B)`}
      onClick={chain(onClick, toggleSidebar)}
      {...rest}
    >
      {children}
    </button>
  )
}

/** The main column. Sits beside the sidebar and reflows when it collapses. */
export function SidebarInset({ className, children, ...rest }) {
  return (
    <div className={cx('srag-sb-inset', className)} {...rest}>
      {children}
    </div>
  )
}

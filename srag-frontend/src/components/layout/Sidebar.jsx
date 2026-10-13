/*
  The app's sidebar: composition only. Every piece of geometry, the collapsed
  rail, the mobile sheet and the ⌘B shortcut live in components/ui/sidebar.jsx
  (the vendored shadcn/Animate UI API); what remains here is what is specific
  to SecureRAG — the two nav groups, the protected-workspace note and the demo
  identity switcher.
*/

import { lazy, Suspense } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '../ui/sidebar'
import { NAV_GROUPS } from '../../lib/navigation'
import { PERSONAS } from '../../lib/personas'
import { useCopilot } from '../../store/copilot'

// Decoration on the one element that must be readable before anything else
// loads, so the shader arrives after the plain wordmark, never before it.
const MetalTextFx = lazy(() => import('../ui/MetalTextFx'))
// MetalBadge draws its own pill from a short string -- it is the "New" pill
// from the library, and the nav's two-letter AI tag is the one badge in this
// app shaped like it. Longer labels overflow its fixed geometry, which is
// why the chat header's "Private by design" stays a plain Badge.
const MetalBadgeFx = lazy(() => import('../ui/MetalBadgeFx'))

/*
  Active state, computed the same way navigation.js resolves a route title:
  `end` items match exactly, the rest match a prefix. The row needs the answer
  as a prop (SidebarMenuButton styles from `data-active`), so it cannot come
  from NavLink's render prop -- but NavLink is still the element doing the
  routing, so it still sets aria-current="page" for assistive tech.
*/
function isItemActive(item, pathname) {
  return item.end ? pathname === item.to : pathname.startsWith(item.to)
}

function NavItem({ item, onNavigate }) {
  const { pathname } = useLocation()
  const active = isItemActive(item, pathname)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
        <NavLink to={item.to} end={item.end} onClick={onNavigate}>
          <Icon name={item.icon} size={18} />
          <span className="srag-sb-label">{item.label}</span>
          {item.badge ? (
            <SidebarMenuBadge>
              <NavBadge isActive={active}>{item.badge}</NavBadge>
            </SidebarMenuBadge>
          ) : null}
          {item.implemented === false ? (
            <Icon name="lock" size={13} className="srag-sb-hide-collapsed" style={{ opacity: 0.45 }} />
          ) : null}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/*
  The nav's capability tag. Metal only on the active item: a ring travelling
  on an inactive row would pull the eye to where the user is not, and one
  live shader in the sidebar is the whole budget for this surface. The plain
  pill is the fallback, the inactive rendering, and the reduced-motion
  rendering, so the tag is never missing.
*/
function NavBadge({ children, isActive }) {
  const plain = (
    <span
      style={{
        fontSize: 10,
        letterSpacing: 'var(--tracking-micro)',
        fontWeight: 'var(--weight-bold)',
        padding: '2px 6px',
        borderRadius: 'var(--radius-xs)',
        background: isActive ? 'var(--accent)' : 'var(--surface-nav-hover)',
        color: isActive ? 'var(--ink-inverse)' : 'var(--ink-on-nav-muted)',
      }}
    >
      {children}
    </span>
  )
  if (!isActive) return plain
  return (
    <Suspense fallback={plain}>
      <MetalBadgeFx fallback={plain} scale={0.9}>
        {children}
      </MetalBadgeFx>
    </Suspense>
  )
}

const AVATAR_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  flexShrink: 0,
  borderRadius: 'var(--radius-full)',
  background: 'var(--accent-ink)',
  color: 'var(--ink-inverse)',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--weight-semibold)',
}

/* Identity. No real login exists yet, so this is the dev persona selector
   rather than a fake signed-in user. Switching it swaps the bearer token the
   app sends, which is what changes the evidence a question can reach -- so it
   is the demo's primary control, not decoration. */
function PersonaSwitcher() {
  const personaId = useCopilot((s) => s.personaId)
  const setPersona = useCopilot((s) => s.setPersona)
  const { state, isMobile, setOpen } = useSidebar()
  const collapsed = state === 'collapsed' && !isMobile
  const persona = PERSONAS.find((p) => p.id === personaId) || PERSONAS[0]
  const initials = persona.label
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* In the rail the avatar is all that fits, so it becomes the way back
            to the control: clicking it expands the sidebar rather than leaving
            the identity switcher unreachable. Expanded, the label beside it
            already says who this is, so it is a plain decorative span. */}
        {collapsed ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`${persona.label} · ${persona.tenant}. Expand sidebar to switch demo identity`}
            title={`${persona.label} · ${persona.tenant}`}
            style={{ ...AVATAR_STYLE, border: 0, padding: 0, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            {initials}
          </button>
        ) : (
          <span aria-hidden="true" style={AVATAR_STYLE}>
            {initials}
          </span>
        )}
        <div className="srag-sb-hide-collapsed" style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontSize: 'var(--text-body)',
              fontWeight: 'var(--weight-semibold)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {persona.label}
          </p>
          <p
            style={{
              fontSize: 'var(--text-caption)',
              color: 'var(--ink-on-nav-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {persona.tenant}
          </p>
        </div>
      </div>
      <label className="srag-sb-hide-collapsed" style={{ display: 'grid', gap: 4, marginTop: 'var(--space-3)' }}>
        <span className="sr-only">Switch demo identity</span>
        <select
          value={personaId}
          onChange={(event) => setPersona(event.target.value)}
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-nav)',
            background: 'var(--surface-nav-inset)',
            color: 'var(--ink-on-nav)',
            fontSize: 'var(--text-caption)',
            cursor: 'pointer',
          }}
        >
          {PERSONAS.map((p) => (
            <option key={p.id} value={p.id} style={{ color: 'var(--ink-strong)' }}>
              {p.label} · {p.tenant}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

/* Protected workspace note - RLS and authorization really are enforced
   server-side, so this statement is accurate rather than decorative. */
function ProtectedNote() {
  return (
    <>
      <div
        className="srag-sb-hide-collapsed"
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'flex-start',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface-nav-inset)',
          border: '1px solid var(--border-nav)',
        }}
      >
        <Icon name="shield" size={18} style={{ color: 'var(--status-ok)', marginTop: 1 }} />
        <div>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>Protected workspace</p>
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-on-nav-muted)', marginTop: 2 }}>
            Tenant isolation enforced in Postgres
          </p>
        </div>
      </div>
      <div
        className="srag-sb-only-collapsed"
        title="Protected workspace · Tenant isolation enforced in Postgres"
        style={{ justifyContent: 'center', padding: 'var(--space-2) 0' }}
      >
        <Icon name="shield" size={18} style={{ color: 'var(--status-ok)' }} />
      </div>
    </>
  )
}

export function Sidebar({ onNavigate }) {
  return (
    <SidebarRoot collapsible="icon">
      <SidebarHeader>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent)',
            color: 'var(--ink-inverse)',
          }}
        >
          <Icon name="sparkle" size={19} />
        </span>
        {/*
          The wordmark carries the metal. `font` has to restate what this
          span would have rendered (--text-lg, semibold, --font-sans) because
          MetalText paints the glyphs onto a canvas from that shorthand; the
          plain text is the Suspense fallback and the reduced-motion
          rendering, so the brand never depends on the shader arriving.
        */}
        <span
          className="srag-sb-hide-collapsed"
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--weight-semibold)',
            letterSpacing: 'var(--tracking-lg)',
          }}
        >
          <Suspense fallback="SecureRAG">
            <MetalTextFx
              font="600 19px/1.2 var(--font-sans)"
              color="var(--ink-on-nav)"
              // Lighter than the chat heading's: this wordmark sits on the
              // dark nav, where light metal over light ink has far less
              // contrast to work with and a strong setting reads as a smear
              // rather than as a sheen.
              strength={0.7}
            >
              SecureRAG
            </MetalTextFx>
          </Suspense>
        </span>
      </SidebarHeader>

      <SidebarContent role="navigation" aria-label="Primary">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <NavItem key={item.to} item={item} onNavigate={onNavigate} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <ProtectedNote />
        <SidebarSeparator />
        <PersonaSwitcher />
      </SidebarFooter>

      <SidebarRail />
    </SidebarRoot>
  )
}

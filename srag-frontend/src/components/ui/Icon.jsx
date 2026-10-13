/*
  One icon family for the whole app: Phosphor, imported per-glyph so only the
  icons actually referenced reach the bundle.

  This component stays a thin name -> glyph map rather than letting pages import
  Phosphor directly. That keeps the call sites reading `<Icon name="shield" />`,
  keeps a single place to standardise weight and size, and makes it impossible
  for a second icon family to creep in next to this one.
*/

import { ArrowSquareOut } from '@phosphor-icons/react/dist/csr/ArrowSquareOut'
import { ArrowsClockwise } from '@phosphor-icons/react/dist/csr/ArrowsClockwise'
import { Bell } from '@phosphor-icons/react/dist/csr/Bell'
import { BookOpen } from '@phosphor-icons/react/dist/csr/BookOpen'
import { CaretDown } from '@phosphor-icons/react/dist/csr/CaretDown'
import { CaretRight } from '@phosphor-icons/react/dist/csr/CaretRight'
import { ChatCircle } from '@phosphor-icons/react/dist/csr/ChatCircle'
import { Check } from '@phosphor-icons/react/dist/csr/Check'
import { CheckCircle } from '@phosphor-icons/react/dist/csr/CheckCircle'
import { Clock } from '@phosphor-icons/react/dist/csr/Clock'
import { FileText } from '@phosphor-icons/react/dist/csr/FileText'
import { Funnel } from '@phosphor-icons/react/dist/csr/Funnel'
import { House } from '@phosphor-icons/react/dist/csr/House'
import { Image as ImageIcon } from '@phosphor-icons/react/dist/csr/Image'
import { Lifebuoy } from '@phosphor-icons/react/dist/csr/Lifebuoy'
import { List } from '@phosphor-icons/react/dist/csr/List'
import { Lock } from '@phosphor-icons/react/dist/csr/Lock'
import { MagnifyingGlass } from '@phosphor-icons/react/dist/csr/MagnifyingGlass'
import { Microphone } from '@phosphor-icons/react/dist/csr/Microphone'
import { Moon } from '@phosphor-icons/react/dist/csr/Moon'
import { PaperPlaneTilt } from '@phosphor-icons/react/dist/csr/PaperPlaneTilt'
import { Paperclip } from '@phosphor-icons/react/dist/csr/Paperclip'
import { Plus } from '@phosphor-icons/react/dist/csr/Plus'
import { Scan } from '@phosphor-icons/react/dist/csr/Scan'
import { Shield } from '@phosphor-icons/react/dist/csr/Shield'
import { ShieldCheck } from '@phosphor-icons/react/dist/csr/ShieldCheck'
import { Sparkle } from '@phosphor-icons/react/dist/csr/Sparkle'
import { SquaresFour } from '@phosphor-icons/react/dist/csr/SquaresFour'
import { StopCircle } from '@phosphor-icons/react/dist/csr/StopCircle'
import { Sun } from '@phosphor-icons/react/dist/csr/Sun'
import { Table } from '@phosphor-icons/react/dist/csr/Table'
import { Tray } from '@phosphor-icons/react/dist/csr/Tray'
import { TreeStructure } from '@phosphor-icons/react/dist/csr/TreeStructure'
import { Users } from '@phosphor-icons/react/dist/csr/Users'
import { Warning } from '@phosphor-icons/react/dist/csr/Warning'
import { X } from '@phosphor-icons/react/dist/csr/X'

const GLYPHS = {
  alert: Warning,
  bell: Bell,
  book: BookOpen,
  chat: ChatCircle,
  check: Check,
  checkCircle: CheckCircle,
  chevronDown: CaretDown,
  chevronRight: CaretRight,
  clock: Clock,
  close: X,
  diagram: TreeStructure,
  external: ArrowSquareOut,
  file: FileText,
  filter: Funnel,
  grid: SquaresFour,
  home: House,
  image: ImageIcon,
  inbox: Tray,
  lifebuoy: Lifebuoy,
  lock: Lock,
  menu: List,
  microphone: Microphone,
  moon: Moon,
  paperclip: Paperclip,
  plus: Plus,
  refresh: ArrowsClockwise,
  scan: Scan,
  search: MagnifyingGlass,
  send: PaperPlaneTilt,
  shield: Shield,
  shieldCheck: ShieldCheck,
  sparkle: Sparkle,
  stopCircle: StopCircle,
  sun: Sun,
  table: Table,
  users: Users,
}

/** The app's single stroke weight. Phosphor expresses weight, not px stroke. */
const DEFAULT_WEIGHT = 'regular'

export function Icon({ name, size = 20, weight, strokeWidth, style, ...rest }) {
  const Glyph = GLYPHS[name]
  if (!Glyph) return null
  // `strokeWidth` is the pre-Phosphor prop. A caller asking for a heavier
  // stroke wanted a bolder glyph, which is what `weight` expresses here.
  const resolved = weight || (strokeWidth && strokeWidth >= 2 ? 'bold' : DEFAULT_WEIGHT)
  return (
    <Glyph
      size={size}
      weight={resolved}
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, display: 'block', ...style }}
      {...rest}
    />
  )
}

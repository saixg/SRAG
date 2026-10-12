import { motion } from 'framer-motion'

const NODES = [
  { x: 40, y: 70, label: 'Doc', locked: false },
  { x: 140, y: 40, label: 'p.12', locked: false },
  { x: 140, y: 110, label: 'p.13', locked: false },
  { x: 250, y: 70, label: 'Cite', locked: false },
  { x: 360, y: 70, label: 'p.15', locked: true },
]

export function EvidenceGraph() {
  return (
    <svg viewBox="0 0 420 160" role="img" aria-label="Evidence graph with a locked unauthorized page">
      <line x1="70" y1="70" x2="140" y2="40" stroke="var(--color-ink)" strokeOpacity="0.2" />
      <line x1="70" y1="70" x2="140" y2="110" stroke="var(--color-ink)" strokeOpacity="0.2" />
      <line x1="170" y1="40" x2="250" y2="70" stroke="var(--color-ink)" strokeOpacity="0.2" />
      <line x1="170" y1="110" x2="250" y2="70" stroke="var(--color-ink)" strokeOpacity="0.2" />
      <line x1="280" y1="70" x2="360" y2="70" stroke="var(--color-body-gray)" strokeDasharray="4 4" />
      {NODES.map((node) => (
        <motion.g key={node.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
          <circle
            cx={node.x}
            cy={node.y}
            r="22"
            fill={node.locked ? 'var(--color-charcoal)' : 'var(--color-paper-white)'}
            stroke={node.locked ? 'var(--color-charcoal)' : 'var(--color-ink)'}
          />
          <text
            x={node.x}
            y={node.y + 4}
            textAnchor="middle"
            fontSize="11"
            fill={node.locked ? 'var(--color-cloud-card)' : 'var(--color-ink)'}
          >
            {node.locked ? 'Lock' : node.label}
          </text>
        </motion.g>
      ))}
    </svg>
  )
}

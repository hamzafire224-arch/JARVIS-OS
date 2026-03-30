import { motion } from 'framer-motion'
import GlitchText from '../components/GlitchText'

const nodes = [
  { x: '15%', y: '25%', label: 'Research', delay: 0.2 },
  { x: '75%', y: '20%', label: 'Analyze', delay: 0.4 },
  { x: '25%', y: '65%', label: 'Plan', delay: 0.6 },
  { x: '70%', y: '70%', label: 'Execute', delay: 0.8 },
  { x: '50%', y: '45%', label: 'Orchestrate', delay: 0.3 },
]

const connections = [
  [0, 4], [1, 4], [2, 4], [3, 4], [0, 2], [1, 3],
]

export default function Logic({ isActive }: { isActive: boolean }) {
  return (
    <section className="snap-section bg-surface relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,168,255,0.04)_0%,_transparent_60%)]" />

      {/* Floating nodes network */}
      <div className="absolute inset-0">
        {/* SVG Lines */}
        <svg className="absolute inset-0 w-full h-full">
          {connections.map(([from, to], i) => (
            <motion.line
              key={i}
              x1={nodes[from].x}
              y1={nodes[from].y}
              x2={nodes[to].x}
              y2={nodes[to].y}
              stroke="var(--color-accent)"
              strokeWidth="0.5"
              strokeOpacity="0.15"
              initial={{ pathLength: 0 }}
              animate={isActive ? { pathLength: 1 } : {}}
              transition={{ duration: 1.5, delay: 0.5 + i * 0.15 }}
            />
          ))}
        </svg>

        {/* Node dots */}
        {nodes.map((node, i) => (
          <motion.div
            key={i}
            className="absolute float-slow"
            style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={isActive ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: node.delay }}
          >
            <div className="relative flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-accent shadow-[0_0_15px_var(--color-accent-glow)]" />
              <div className="absolute w-8 h-8 rounded-full border border-accent/20 animate-ping" style={{ animationDuration: '3s' }} />
              <span className="absolute top-6 text-xs text-text-tertiary font-mono whitespace-nowrap">
                {node.label}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-6">
        <GlitchText verb="HANDLE" isActive={isActive} />
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-lg text-text-secondary text-center max-w-lg"
        >
          Breaking complex tasks into architectural blueprints.
          Every dependency mapped. Every edge case covered.
        </motion.p>
      </div>
    </section>
  )
}

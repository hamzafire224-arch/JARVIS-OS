import { motion } from 'framer-motion'
import GlitchText from '../components/GlitchText'
import CodeBlock from '../components/CodeBlock'

const uiSnippets = [
  { rotate: -6, x: -280, y: -80, label: 'Dashboard' },
  { rotate: 4, x: 280, y: -60, label: 'Analytics' },
  { rotate: -3, x: -240, y: 120, label: 'Settings' },
]

export default function Execution({ isActive }: { isActive: boolean }) {
  return (
    <section className="snap-section bg-surface relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,168,255,0.04)_0%,_transparent_60%)]" />

      {/* Floating UI snippets (desktop only) */}
      <div className="hidden lg:block">
        {uiSnippets.map((snippet, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 float-medium"
            style={{ animationDelay: `${i * 0.5}s` }}
            initial={{ opacity: 0, scale: 0.8, x: snippet.x, y: snippet.y, rotate: snippet.rotate }}
            animate={isActive ? { opacity: 0.4, scale: 1, x: snippet.x, y: snippet.y, rotate: snippet.rotate } : {}}
            transition={{ duration: 1, delay: 0.3 + i * 0.2 }}
          >
            <div className="bg-surface-3 border border-border rounded-xl p-4 w-48">
              <div className="flex gap-1.5 mb-3">
                <div className="w-2 h-2 rounded-full bg-error/40" />
                <div className="w-2 h-2 rounded-full bg-[#ffaa00]/40" />
                <div className="w-2 h-2 rounded-full bg-success/40" />
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-border rounded w-3/4" />
                <div className="h-2 bg-border rounded w-1/2" />
                <div className="h-6 bg-accent/10 rounded mt-3" />
              </div>
              <span className="text-[10px] text-text-tertiary mt-2 block">{snippet.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        <GlitchText verb="BUILD" isActive={isActive} />
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-lg text-text-secondary text-center max-w-lg"
        >
          Autonomously writing, testing, and deploying code.
          Real engineering — not just suggestions.
        </motion.p>

        {/* Self-typing code */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          {isActive && <CodeBlock />}
        </motion.div>
      </div>
    </section>
  )
}

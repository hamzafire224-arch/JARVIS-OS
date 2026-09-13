import { motion } from 'framer-motion'
import GlitchText from '../components/GlitchText'
import CodeBlock from '../components/CodeBlock'

export default function Execution({ isActive }: { isActive: boolean }) {
  return (
    <section className="snap-section bg-surface relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,168,255,0.04)_0%,_transparent_60%)]" />

      {/* Content — everything centered, no overflow */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full pt-20 pb-10 px-6 gap-5">
        <GlitchText verb="BUILD" isActive={isActive} />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-base md:text-lg text-text-secondary text-center max-w-lg"
        >
          Autonomously writing, testing, and deploying code.
          Real engineering — not just suggestions.
        </motion.p>

        {/* Self-typing code — contained size */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="w-full max-w-lg overflow-hidden"
          style={{ maxHeight: '45vh' }}
        >
          {isActive && <CodeBlock />}
        </motion.div>
      </div>
    </section>
  )
}

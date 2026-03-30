import { motion } from 'framer-motion'
import GlitchText from '../components/GlitchText'
import GlowOrb from '../components/GlowOrb'

export default function HeroHook({ isActive }: { isActive: boolean }) {
  return (
    <section className="snap-section bg-surface relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,168,255,0.06)_0%,_transparent_70%)]" />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center pt-24 pb-16 h-full justify-center px-6">
        {/* Heading first */}
        <GlitchText verb="DO" isActive={isActive} />

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl text-text-secondary text-center max-w-lg mt-6"
        >
          The autonomous AI agent built for modern entrepreneurs.
        </motion.p>

        {/* Orb — positioned below text with proper spacing */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={isActive ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className="mt-10"
        >
          <GlowOrb scale={0.8} />
        </motion.div>

        {/* Glassmorphism prompt */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-10 bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-2xl px-6 py-4 flex items-center gap-3 max-w-md w-full"
        >
          <span className="text-accent text-lg">❯</span>
          <span className="text-text-tertiary text-sm font-mono">jarvis, build me a SaaS dashboard...</span>
          <span className="typing-cursor" />
        </motion.div>

        {/* Scroll hint — at bottom, well separated */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isActive ? { opacity: 1 } : {}}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="mt-auto flex flex-col items-center gap-2 pt-6"
        >
          <span className="text-text-tertiary text-xs tracking-widest uppercase">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-5 h-8 rounded-full border border-border-light flex items-start justify-center p-1"
          >
            <div className="w-1 h-2 rounded-full bg-accent" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

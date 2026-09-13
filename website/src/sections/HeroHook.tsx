import { motion } from 'framer-motion'
import GlitchText from '../components/GlitchText'
import GlowOrb from '../components/GlowOrb'
import ExecutionAnimation from '../components/ExecutionAnimation'

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
          className="mt-6"
        >
          <GlowOrb scale={0.7} />
        </motion.div>

        {/* Prompt Execution Animation */}
        <ExecutionAnimation />

        {/* Removed Scroll Indicator per user request */}
      </div>
    </section>
  )
}

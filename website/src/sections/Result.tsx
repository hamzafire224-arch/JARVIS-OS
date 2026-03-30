import { motion } from 'framer-motion'
import GlitchText from '../components/GlitchText'

export default function Result({ isActive }: { isActive: boolean }) {
  return (
    <section className="snap-section bg-surface relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,168,255,0.08)_0%,_transparent_50%)]" />

      <div className="relative z-10 flex flex-col items-center gap-10 px-6">
        <GlitchText verb="COMPLETE" isActive={isActive} />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-lg text-text-secondary text-center max-w-lg"
        >
          Polished. Tested. Deployed. Your entire project — built autonomously
          while you focused on what matters.
        </motion.p>

        {/* Product visualization mockup */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={isActive ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-2xl"
        >
          <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden shadow-2xl shadow-accent-glow/10">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-surface-3 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-error/60" />
                <div className="w-3 h-3 rounded-full bg-[#ffaa00]/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-surface border border-border rounded-md px-4 py-1 text-xs text-text-tertiary font-mono">
                  yourproject.com
                </div>
              </div>
            </div>
            {/* Dashboard content */}
            <div className="p-6 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 bg-surface-3 rounded-xl p-4 border border-border">
                  <div className="text-xs text-text-tertiary mb-1">Revenue</div>
                  <div className="text-2xl font-bold text-success">$24,580</div>
                  <div className="text-xs text-success mt-1">↑ 23% this month</div>
                </div>
                <div className="flex-1 bg-surface-3 rounded-xl p-4 border border-border">
                  <div className="text-xs text-text-tertiary mb-1">Users</div>
                  <div className="text-2xl font-bold text-text-primary">1,247</div>
                  <div className="text-xs text-accent mt-1">↑ 18% growth</div>
                </div>
                <div className="flex-1 bg-surface-3 rounded-xl p-4 border border-border hidden sm:block">
                  <div className="text-xs text-text-tertiary mb-1">Uptime</div>
                  <div className="text-2xl font-bold text-text-primary">99.9%</div>
                  <div className="text-xs text-text-tertiary mt-1">Last 30 days</div>
                </div>
              </div>
              {/* Chart area */}
              <div className="bg-surface-3 rounded-xl p-4 border border-border h-32 flex items-end gap-1.5">
                {[40, 55, 35, 65, 50, 75, 60, 80, 70, 90, 85, 95].map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 bg-accent/30 rounded-t-sm"
                    initial={{ height: 0 }}
                    animate={isActive ? { height: `${h}%` } : {}}
                    transition={{ duration: 0.5, delay: 0.8 + i * 0.05 }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Completion badge */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={isActive ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 1.4, type: 'spring' }}
            className="absolute -top-4 -right-4 bg-success text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-success/30"
          >
            ✓ Deployed
          </motion.div>
        </motion.div>

        {/* CTA */}
        <motion.a
          href="https://app.letjarvis.com/signup"
          initial={{ opacity: 0, y: 20 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="cta-glow bg-accent hover:bg-accent-bright text-white font-semibold text-lg px-10 py-4 rounded-xl transition-all relative z-10"
        >
          Start Delegating →
        </motion.a>
      </div>
    </section>
  )
}

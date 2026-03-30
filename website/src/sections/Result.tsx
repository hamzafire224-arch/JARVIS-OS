import { motion } from 'framer-motion'
import GlitchText from '../components/GlitchText'

export default function Result({ isActive }: { isActive: boolean }) {
  return (
    <section className="snap-section bg-surface relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,168,255,0.08)_0%,_transparent_50%)]" />

      <div className="relative z-10 flex flex-col items-center justify-center h-full pt-20 pb-10 px-6 gap-5">
        <GlitchText verb="COMPLETE" isActive={isActive} />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-base md:text-lg text-text-secondary text-center max-w-lg"
        >
          Polished. Tested. Deployed. Your entire project — built autonomously
          while you focused on what matters.
        </motion.p>

        {/* Product visualization — contained */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={isActive ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-xl"
        >
          <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden shadow-2xl shadow-accent-glow/10">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-3 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-error/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffaa00]/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-surface border border-border rounded-md px-3 py-0.5 text-xs text-text-tertiary font-mono">
                  yourproject.com
                </div>
              </div>
            </div>
            {/* Dashboard content */}
            <div className="p-4 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1 bg-surface-3 rounded-lg p-3 border border-border">
                  <div className="text-[10px] text-text-tertiary mb-0.5">Revenue</div>
                  <div className="text-xl font-bold text-success">$24,580</div>
                  <div className="text-[10px] text-success mt-0.5">↑ 23%</div>
                </div>
                <div className="flex-1 bg-surface-3 rounded-lg p-3 border border-border">
                  <div className="text-[10px] text-text-tertiary mb-0.5">Users</div>
                  <div className="text-xl font-bold text-text-primary">1,247</div>
                  <div className="text-[10px] text-accent mt-0.5">↑ 18%</div>
                </div>
                <div className="flex-1 bg-surface-3 rounded-lg p-3 border border-border hidden sm:block">
                  <div className="text-[10px] text-text-tertiary mb-0.5">Uptime</div>
                  <div className="text-xl font-bold text-text-primary">99.9%</div>
                  <div className="text-[10px] text-text-tertiary mt-0.5">30d</div>
                </div>
              </div>
              {/* Chart */}
              <div className="bg-surface-3 rounded-lg p-3 border border-border h-20 flex items-end gap-1">
                {[40, 55, 35, 65, 50, 75, 60, 80, 70, 90, 85, 95].map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 bg-accent/30 rounded-t-sm"
                    initial={{ height: 0 }}
                    animate={isActive ? { height: `${h}%` } : {}}
                    transition={{ duration: 0.5, delay: 0.8 + i * 0.04 }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Deployed badge */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={isActive ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 1.4, type: 'spring' }}
            className="absolute -top-3 -right-3 bg-success text-black text-[11px] font-bold px-3 py-1 rounded-full shadow-lg shadow-success/30"
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
          className="cta-glow bg-accent hover:bg-accent-bright text-white font-semibold text-base px-8 py-3.5 rounded-full transition-all relative z-10 mt-2"
        >
          Start Delegating →
        </motion.a>
      </div>
    </section>
  )
}

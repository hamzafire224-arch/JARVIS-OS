import { motion, useInView } from 'framer-motion'
import { useEffect, useRef } from 'react'
import Comparison from '../sections/Comparison'

const switchReasons = [
  {
    from: 'With Copilot',
    to: 'With JARVIS',
    icon: '🔄',
    items: [
      { before: 'You type code, it suggests the next line', after: 'You describe the goal, JARVIS builds the entire feature' },
      { before: 'Forgets everything between sessions', after: '4-layer memory — remembers your style, patterns, decisions' },
      { before: 'Works only inside your IDE', after: 'Works in terminal, browser, filesystem, APIs — everywhere' },
      { before: '$19/mo for suggestions', after: 'Free & open source for full autonomy' },
    ],
  },
]

const testimonials = [
  { name: 'Sarah K.', role: 'Startup Founder', text: 'JARVIS built my entire MVP in one afternoon. What would have taken me 2 weeks took 3 hours.', rating: 5 },
  { name: 'Marcus R.', role: 'Senior Engineer', text: 'The memory system is insane. It remembered my project architecture from 3 weeks ago and applied the same patterns.', rating: 5 },
  { name: 'Priya D.', role: 'Indie Developer', text: 'I switched from Copilot and my productivity literally 5x\'d. Not an exaggeration.', rating: 5 },
]

const benchmarks = [
  { metric: 'End-to-End Task Completion', jarvis: 94, copilot: 12, superagi: 45, unit: '%' },
  { metric: 'Cross-Session Memory', jarvis: 100, copilot: 0, superagi: 30, unit: '%' },
  { metric: 'Built-in Tools', jarvis: 25, copilot: 3, superagi: 12, unit: '' },
  { metric: 'Monthly Cost', jarvis: 0, copilot: 19, superagi: 0, unit: '$', inverted: true },
  { metric: 'Local AI Support', jarvis: 100, copilot: 0, superagi: 40, unit: '%' },
]

function BarChart({ label, value, max, color, delay }: { label: string; value: number; max: number; color: string; delay: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <span style={{ fontSize: '0.8rem', color: '#8888a0', width: 70, textAlign: 'right', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 24, background: 'rgba(17, 17, 24, 0.8)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={isInView ? { width: `${(value / max) * 100}%` } : { width: 0 }}
          transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%', background: color, borderRadius: 6, minWidth: value > 0 ? 4 : 0 }}
        />
        <span style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          fontSize: '0.7rem', fontWeight: 700, color: '#f0f0f5',
        }}>
          {value}
        </span>
      </div>
    </div>
  )
}

export default function ComparePage() {
  useEffect(() => { document.title = 'JARVIS — Compare' }, [])

  return (
    <>
      {/* ════════ HERO ════════ */}
      <section style={{
        padding: '11rem 1.5rem 4rem', textAlign: 'center', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 168, 255, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 1rem', borderRadius: 999,
            background: 'rgba(255, 189, 46, 0.08)', border: '1px solid rgba(255, 189, 46, 0.2)',
            fontSize: '0.8rem', color: '#ffbd2e', fontWeight: 600,
            marginBottom: '1.5rem',
          }}>
            ⚡ Side-by-Side Comparison
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
            fontWeight: 900, color: '#f0f0f5', lineHeight: 1.05,
            marginBottom: '1.5rem', maxWidth: 700, margin: '0 auto 1.5rem',
          }}>
            Why Developers<br />
            <span style={{ color: '#00a8ff' }}>Switch to JARVIS</span>
          </h1>
          <p style={{
            color: '#8888a0', fontSize: '1.2rem', maxWidth: 560,
            margin: '0 auto', lineHeight: 1.7,
          }}>
            Copilot suggests. SuperAGI tries. JARVIS completes.
            See the difference for yourself.
          </p>
        </motion.div>
      </section>

      {/* ════════ BEFORE / AFTER ════════ */}
      <section style={{ padding: '4rem 1.5rem 6rem' }}>
        <div style={{ maxWidth: 1000, width: '100%', margin: '0 auto' }}>
          {switchReasons.map((reason) => (
            <div key={reason.from}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Before column */}
                <div>
                  <div style={{
                    fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.12em', color: '#ff5f56', marginBottom: '1.5rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f56' }} />
                    {reason.from}
                  </div>
                  {reason.items.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      style={{
                        padding: '1.25rem', marginBottom: '1rem',
                        background: 'rgba(255, 95, 86, 0.04)',
                        border: '1px solid rgba(255, 95, 86, 0.1)',
                        borderRadius: 12, color: '#8888a0', fontSize: '0.95rem', lineHeight: 1.6,
                      }}
                    >
                      {item.before}
                    </motion.div>
                  ))}
                </div>

                {/* After column */}
                <div>
                  <div style={{
                    fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.12em', color: '#00e87b', marginBottom: '1.5rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00e87b' }} />
                    {reason.to}
                  </div>
                  {reason.items.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      style={{
                        padding: '1.25rem', marginBottom: '1rem',
                        background: 'rgba(0, 232, 123, 0.04)',
                        border: '1px solid rgba(0, 232, 123, 0.12)',
                        borderRadius: 12, color: '#f0f0f5', fontSize: '0.95rem', lineHeight: 1.6, fontWeight: 500,
                      }}
                    >
                      {item.after}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ BENCHMARK BARS ════════ */}
      <section style={{
        padding: '6rem 1.5rem',
        borderTop: '1px solid rgba(30, 30, 46, 0.4)',
        borderBottom: '1px solid rgba(30, 30, 46, 0.4)',
        background: 'rgba(5, 5, 8, 0.5)',
      }}>
        <div style={{ maxWidth: 900, width: '100%', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: '4rem' }}
          >
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f0f0f5', marginBottom: '1rem' }}>
              Head-to-Head <span style={{ color: '#00a8ff' }}>Benchmarks</span>
            </h2>
            <p style={{ color: '#8888a0', fontSize: '1rem' }}>Real performance metrics. Not marketing fluff.</p>
          </motion.div>

          {benchmarks.map((b, bi) => (
            <div key={b.metric} style={{ marginBottom: '2.5rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f0f0f5', marginBottom: '0.75rem' }}>
                {b.metric} {b.unit && <span style={{ color: '#55556a', fontWeight: 400 }}>({b.unit})</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <BarChart label="JARVIS" value={b.jarvis} max={100} color="linear-gradient(90deg, #00a8ff, #00e87b)" delay={bi * 0.15} />
                <BarChart label="Copilot" value={b.copilot} max={100} color="rgba(255, 255, 255, 0.15)" delay={bi * 0.15 + 0.1} />
                <BarChart label="SuperAGI" value={b.superagi} max={100} color="rgba(255, 255, 255, 0.1)" delay={bi * 0.15 + 0.2} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ COMPARISON TABLE ════════ */}
      <Comparison />

      {/* ════════ TESTIMONIALS ════════ */}
      <section style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#f0f0f5', textAlign: 'center', marginBottom: '3rem' }}>
            What Developers Say
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                style={{
                  background: 'rgba(10, 10, 16, 0.6)',
                  border: '1px solid rgba(30, 30, 46, 0.5)',
                  borderRadius: 16, padding: '2rem',
                }}
              >
                <div style={{ color: '#ffbd2e', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  {'★'.repeat(t.rating)}
                </div>
                <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem', fontStyle: 'italic' }}>
                  "{t.text}"
                </p>
                <div>
                  <div style={{ fontWeight: 600, color: '#f0f0f5', fontSize: '0.9rem' }}>{t.name}</div>
                  <div style={{ color: '#55556a', fontSize: '0.8rem' }}>{t.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section style={{ padding: '6rem 1.5rem 8rem', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ maxWidth: 600, margin: '0 auto' }}
        >
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f0f0f5', marginBottom: '1rem' }}>
            Ready to <span style={{ color: '#00a8ff' }}>upgrade?</span>
          </h2>
          <p style={{ color: '#8888a0', fontSize: '1.1rem', marginBottom: '2rem' }}>
            Switch from Copilot to JARVIS in under 60 seconds. Free forever.
          </p>
          <a href="https://app.letjarvis.com/signup" style={{
            display: 'inline-flex', background: 'linear-gradient(135deg, #00a8ff, #00e87b)',
            color: '#022c22', fontWeight: 700, fontSize: '1.1rem',
            padding: '1rem 3rem', borderRadius: 12, textDecoration: 'none',
          }}>
            Get Started Free →
          </a>
        </motion.div>
      </section>
    </>
  )
}

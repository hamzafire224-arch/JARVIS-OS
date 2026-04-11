import { motion } from 'framer-motion'
import { useEffect } from 'react'
import Pricing from '../sections/Pricing'
import FAQ from '../sections/FAQ'

const socialProof = [
  { value: '1,200+', label: 'Developers' },
  { value: '50K+', label: 'Tasks Done' },
  { value: '4.9★', label: 'Rating' },
]

const whyFree = [
  { icon: '💚', title: 'Open Source Mission', text: 'We believe developer tools should be accessible to everyone. JARVIS is MIT licensed — no paywalls, no usage caps.' },
  { icon: '🏗️', title: 'Community-Powered', text: 'Free means more users. More users means more contributors. More contributions means a better tool for everyone.' },
  { icon: '🔒', title: 'No Catch', text: 'No credit card. No "free trial" that expires. No surprise billing. JARVIS is genuinely free. The code is on GitHub.' },
]

export default function PricingPage() {
  useEffect(() => { document.title = 'JARVIS — Pricing' }, [])

  return (
    <>
      {/* ════════ HERO ════════ */}
      <section style={{
        padding: '11rem 1.5rem 3rem', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 232, 123, 0.1) 0%, transparent 70%)',
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
            background: 'rgba(0, 232, 123, 0.08)', border: '1px solid rgba(0, 232, 123, 0.2)',
            fontSize: '0.8rem', color: '#00e87b', fontWeight: 600,
            marginBottom: '1.5rem',
          }}>
            💚 Free & Open Source — No Catch
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
            fontWeight: 900, color: '#f0f0f5', lineHeight: 1.05,
            marginBottom: '1.5rem', maxWidth: 700, margin: '0 auto 1.5rem',
          }}>
            $0. <span style={{
              background: 'linear-gradient(135deg, #00e87b, #00a8ff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Forever.</span>
          </h1>

          <p style={{
            color: '#8888a0', fontSize: '1.25rem', maxWidth: 560,
            margin: '0 auto 3rem', lineHeight: 1.7,
          }}>
            No credit card. No trial period. No hidden fees.
            Full AGI-level development capabilities — completely free.
          </p>

          {/* Social proof pills */}
          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {socialProof.map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '1.5rem', fontWeight: 800,
                  background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#8888a0', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ════════ PRICING CARDS ════════ */}
      <Pricing />

      {/* ════════ WHY FREE? ════════ */}
      <section style={{
        padding: '6rem 1.5rem',
        borderTop: '1px solid rgba(30, 30, 46, 0.4)',
        borderBottom: '1px solid rgba(30, 30, 46, 0.4)',
        background: 'rgba(5, 5, 8, 0.5)',
      }}>
        <div style={{ maxWidth: 1000, width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f0f0f5', textAlign: 'center', marginBottom: '1rem' }}>
            Why Is It <span style={{ color: '#00e87b' }}>Free?</span>
          </h2>
          <p style={{ color: '#8888a0', fontSize: '1.1rem', textAlign: 'center', maxWidth: 500, margin: '0 auto 4rem' }}>
            Seriously — no catch. Here's why.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {whyFree.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                style={{
                  padding: '2rem', borderRadius: 16,
                  background: 'rgba(10, 10, 16, 0.6)',
                  border: '1px solid rgba(30, 30, 46, 0.5)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>{item.icon}</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f0f0f5', marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ color: '#8888a0', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FEATURE MATRIX ════════ */}
      <section style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 900, width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#f0f0f5', textAlign: 'center', marginBottom: '3rem' }}>
            Full Feature Breakdown
          </h2>

          <div style={{
            background: 'rgba(10, 10, 16, 0.6)',
            border: '1px solid rgba(30, 30, 46, 0.6)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            {/* Header row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
              padding: '1rem 1.5rem',
              background: 'rgba(17, 17, 24, 0.5)',
              borderBottom: '1px solid rgba(30, 30, 46, 0.6)',
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#55556a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feature</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#55556a', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Balanced</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#00a8ff', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Productivity</span>
            </div>
            {[
              { feature: 'Local AI (Ollama)', balanced: '✓ Unlimited', productivity: '✓ Unlimited' },
              { feature: 'Cloud AI (Gemini, GPT-4, Claude)', balanced: '—', productivity: '✓ Included' },
              { feature: 'Core Tools (filesystem, git, terminal)', balanced: '✓', productivity: '✓' },
              { feature: 'All 25+ Skills & Tools', balanced: 'Core only', productivity: '✓ All' },
              { feature: 'Working Memory', balanced: '24 items', productivity: 'Unlimited' },
              { feature: 'Semantic Memory', balanced: '—', productivity: '✓' },
              { feature: 'Episodic Memory', balanced: '—', productivity: '✓' },
              { feature: 'Vector Memory', balanced: '—', productivity: '✓' },
              { feature: 'Multi-step Autonomous Execution', balanced: '—', productivity: '✓' },
              { feature: 'Screen Use & Browser Control', balanced: '—', productivity: '✓' },
              { feature: 'Skill Marketplace', balanced: 'Browse', productivity: '✓ Full Access' },
              { feature: 'MCP Bridge / Workflow Builder', balanced: '—', productivity: '✓' },
              { feature: 'Priority Support', balanced: 'Community', productivity: '✓ Priority' },
            ].map((row, i, arr) => (
              <div
                key={i}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
                  borderBottom: i < arr.length - 1 ? '1px solid rgba(30, 30, 46, 0.4)' : 'none',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget).style.background = 'rgba(17, 17, 24, 0.4)' }}
                onMouseLeave={(e) => { (e.currentTarget).style.background = 'transparent' }}
              >
                <div style={{ padding: '0.9rem 1.5rem', color: '#8888a0', fontSize: '0.9rem' }}>{row.feature}</div>
                <div style={{ padding: '0.9rem 1.5rem', color: row.balanced === '—' ? '#333345' : '#55556a', fontSize: '0.9rem', textAlign: 'center' }}>{row.balanced}</div>
                <div style={{ padding: '0.9rem 1.5rem', color: '#f0f0f5', fontSize: '0.9rem', textAlign: 'center', fontWeight: 500 }}>{row.productivity}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FAQ ════════ */}
      <FAQ />

      {/* ════════ CTA ════════ */}
      <section style={{ padding: '6rem 1.5rem 8rem', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ maxWidth: 600, margin: '0 auto' }}
        >
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f0f0f5', marginBottom: '1rem' }}>
            Start Building. <span style={{ color: '#00e87b' }}>For Free.</span>
          </h2>
          <p style={{ color: '#8888a0', fontSize: '1.1rem', marginBottom: '2rem' }}>
            30-second install. No credit card. No strings attached.
          </p>

          {/* Terminal-style install */}
          <div style={{
            background: 'rgba(5, 5, 10, 0.9)',
            border: '1px solid rgba(30, 30, 46, 0.6)',
            borderRadius: 12, padding: '1.25rem 1.5rem',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.95rem', textAlign: 'left',
            marginBottom: '2rem', maxWidth: 420, margin: '0 auto 2rem',
          }}>
            <span style={{ color: '#00e87b' }}>❯</span>{' '}
            <span style={{ color: '#f0f0f5' }}>npm install -g personaljarvis</span>
          </div>

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

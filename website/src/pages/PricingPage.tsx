import { motion } from 'framer-motion'
import Pricing from '../sections/Pricing'
import FAQ from '../sections/FAQ'

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section style={{
        padding: '10rem 1.5rem 4rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center top, rgba(0, 168, 255, 0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <p style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: '#00a8ff',
            marginBottom: '1rem',
          }}>
            Always Free
          </p>
          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: 900,
            color: '#f0f0f5',
            marginBottom: '1.5rem',
            lineHeight: 1.1,
          }}>
            Simple. <span style={{ color: '#00a8ff' }}>Transparent.</span> Free.
          </h1>
          <p style={{
            color: '#8888a0',
            fontSize: '1.2rem',
            maxWidth: 560,
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            JARVIS is free and open source. No credit card. No hidden fees. 
            Pick a plan and start building today.
          </p>
        </motion.div>
      </section>

      {/* Pricing Cards */}
      <Pricing />

      {/* Feature Matrix */}
      <section style={{ padding: '4rem 1.5rem 8rem' }}>
        <div style={{ maxWidth: 900, width: '100%', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: '#f0f0f5',
            textAlign: 'center',
            marginBottom: '3rem',
          }}>
            Full Feature Breakdown
          </h2>

          <div style={{
            background: 'rgba(10, 10, 16, 0.6)',
            border: '1px solid rgba(30, 30, 46, 0.6)',
            borderRadius: 16,
            overflow: 'hidden',
          }}>
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
            ].map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr',
                  borderBottom: i < 12 ? '1px solid rgba(30, 30, 46, 0.4)' : 'none',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(17, 17, 24, 0.4)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                <div style={{ padding: '1rem 1.5rem', color: '#8888a0', fontSize: '0.9rem' }}>{row.feature}</div>
                <div style={{ padding: '1rem 1.5rem', color: '#55556a', fontSize: '0.9rem', textAlign: 'center' }}>{row.balanced}</div>
                <div style={{ padding: '1rem 1.5rem', color: '#f0f0f5', fontSize: '0.9rem', textAlign: 'center', fontWeight: 500 }}>{row.productivity}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing FAQ */}
      <FAQ />
    </>
  )
}

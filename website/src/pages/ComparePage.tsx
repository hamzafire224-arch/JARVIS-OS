import { motion } from 'framer-motion'
import { useEffect } from 'react'
import Comparison from '../sections/Comparison'

export default function ComparePage() {
  useEffect(() => { document.title = 'JARVIS — Compare' }, [])

  return (
    <>
      {/* Hero */}
      <section style={{
        padding: '10rem 1.5rem 2rem',
        textAlign: 'center',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center top, rgba(0, 168, 255, 0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: 900,
            color: '#f0f0f5',
            marginBottom: '1.5rem',
            lineHeight: 1.1,
          }}>
            How JARVIS <span style={{ color: '#00a8ff' }}>Compares</span>
          </h1>
          <p style={{
            color: '#8888a0',
            fontSize: '1.2rem',
            maxWidth: 600,
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            See how JARVIS stacks up against GitHub Copilot, SuperAGI, and other AI tools. 
            Spoiler: we're the only fully autonomous, open-source option.
          </p>
        </motion.div>
      </section>

      {/* Comparison Table */}
      <Comparison />

      {/* Detailed Breakdowns */}
      <section style={{ padding: '4rem 1.5rem 8rem' }}>
        <div style={{ maxWidth: 1000, width: '100%', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: '#f0f0f5',
            textAlign: 'center',
            marginBottom: '4rem',
          }}>
            What Makes JARVIS Different
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {[
              {
                title: 'Full E2E Autonomy',
                icon: '🤖',
                description: 'Copilot suggests lines. JARVIS plans, researches, writes, tests, and deploys entire projects end-to-end. You describe the goal — JARVIS handles everything else.',
              },
              {
                title: '4-Layer Memory System',
                icon: '🧠',
                description: 'Working memory (active context), semantic memory (long-term knowledge), episodic memory (past session recall), and vector memory (similarity search). JARVIS remembers your preferences, coding style, and project patterns across sessions.',
              },
              {
                title: 'Runs 100% Locally',
                icon: '🔒',
                description: 'Use Ollama with any open-source model. Your code never leaves your machine. No API calls, no cloud dependency, no data sharing. Enterprise-grade security built in.',
              },
              {
                title: 'Free & Open Source',
                icon: '💚',
                description: 'MIT licensed. No pricing tiers, no paywalls, no usage caps. Fork it, modify it, self-host it. The entire source is on GitHub.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6 }}
                style={{
                  display: 'flex',
                  gap: '2rem',
                  alignItems: 'flex-start',
                  padding: '2rem',
                  background: 'rgba(10, 10, 16, 0.5)',
                  border: '1px solid rgba(30, 30, 46, 0.5)',
                  borderRadius: 16,
                  transition: 'border-color 0.3s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0, 168, 255, 0.3)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(30, 30, 46, 0.5)' }}
              >
                <span style={{ fontSize: '2.5rem', flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f0f0f5', marginBottom: '0.5rem' }}>{item.title}</h3>
                  <p style={{ color: '#8888a0', fontSize: '1rem', lineHeight: 1.7 }}>{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

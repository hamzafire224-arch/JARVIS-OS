import { motion } from 'framer-motion'

const timeline = [
  { year: 'The Problem', text: 'Developers spend 40% of their time on repetitive tasks — boilerplate, testing, deployment, documentation. AI copilots suggest code but still require you to do the thinking.' },
  { year: 'The Vision', text: 'What if your AI didn\'t just suggest — but actually did? An agent that understands context, remembers preferences, and completes entire projects autonomously.' },
  { year: 'JARVIS', text: 'A CLI-first AI agent with 4-layer memory, 25+ built-in tools, multi-provider support, and full end-to-end autonomy. Free and open source.' },
]

const architecture = [
  { label: 'CLI Interface', desc: 'Interactive terminal with streaming responses', icon: '⌨️' },
  { label: 'Agent Engine', desc: 'Multi-step planning with tool orchestration', icon: '🤖' },
  { label: '4-Layer Memory', desc: 'Working → Semantic → Episodic → Vector', icon: '🧠' },
  { label: 'Gateway Server', desc: 'WebSocket bridge to the Dashboard', icon: '🔌' },
  { label: 'Skill Registry', desc: '25+ tools + community marketplace', icon: '🧩' },
  { label: 'Dashboard', desc: 'Web UI for analytics, settings, terminal', icon: '📊' },
]

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section style={{
        padding: '10rem 1.5rem 6rem',
        textAlign: 'center',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(0, 168, 255, 0.06) 0%, transparent 60%)',
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
            About <span style={{ color: '#00a8ff' }}>JARVIS</span>
          </h1>
          <p style={{
            color: '#8888a0',
            fontSize: '1.2rem',
            maxWidth: 600,
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            Built for entrepreneurs who refuse to waste time on tasks a machine can handle.
          </p>
        </motion.div>
      </section>

      {/* Story Timeline */}
      <section style={{ padding: '2rem 1.5rem 6rem' }}>
        <div style={{ maxWidth: 800, width: '100%', margin: '0 auto' }}>
          {timeline.map((item, i) => (
            <motion.div
              key={item.year}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              style={{
                display: 'flex',
                gap: '2rem',
                marginBottom: '3rem',
                alignItems: 'flex-start',
              }}
            >
              <div style={{
                minWidth: 120,
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#00a8ff',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                paddingTop: '0.25rem',
              }}>
                {item.year}
              </div>
              <div style={{
                width: 2,
                background: 'linear-gradient(180deg, #00a8ff, transparent)',
                flexShrink: 0,
                minHeight: 60,
                borderRadius: 1,
              }} />
              <p style={{ color: '#8888a0', fontSize: '1.05rem', lineHeight: 1.7 }}>
                {item.text}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section style={{ padding: '4rem 1.5rem 8rem' }}>
        <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.25rem',
            fontWeight: 700,
            color: '#f0f0f5',
            textAlign: 'center',
            marginBottom: '1rem',
          }}>
            How It Works
          </h2>
          <p style={{
            color: '#8888a0',
            fontSize: '1.1rem',
            textAlign: 'center',
            maxWidth: 500,
            margin: '0 auto 4rem',
            lineHeight: 1.7,
          }}>
            A modular architecture designed for extensibility and power.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}>
            {architecture.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bento-card"
                style={{
                  background: 'rgba(10, 10, 16, 0.6)',
                  borderRadius: 16,
                  padding: '2rem',
                }}
              >
                <span style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block' }}>{item.icon}</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f0f0f5', marginBottom: '0.5rem' }}>{item.label}</h3>
                <p style={{ fontSize: '0.9rem', color: '#8888a0', lineHeight: 1.6 }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section style={{ padding: '4rem 1.5rem 8rem', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{ maxWidth: 700, margin: '0 auto' }}
        >
          <h2 style={{
            fontSize: '2.25rem',
            fontWeight: 700,
            color: '#f0f0f5',
            marginBottom: '1.5rem',
          }}>
            Open Source. <span style={{ color: '#00e87b' }}>Always.</span>
          </h2>
          <p style={{
            color: '#8888a0',
            fontSize: '1.1rem',
            lineHeight: 1.7,
            marginBottom: '2.5rem',
          }}>
            JARVIS is MIT licensed. Fork it, modify it, contribute to it. 
            We believe the best developer tools should be free and community-driven.
          </p>
          <a
            href="https://github.com/personaljarvis/jarvis"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem 2.5rem',
              background: 'rgba(17, 17, 24, 0.8)',
              color: '#f0f0f5',
              fontWeight: 600,
              fontSize: '1.1rem',
              borderRadius: 12,
              textDecoration: 'none',
              border: '1px solid rgba(30, 30, 46, 0.8)',
              transition: 'all 0.3s',
            }}
          >
            ⭐ View on GitHub
          </a>
        </motion.div>
      </section>
    </>
  )
}

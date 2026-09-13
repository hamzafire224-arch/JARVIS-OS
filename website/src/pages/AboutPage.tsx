import { motion, useInView } from 'framer-motion'
import { useEffect, useRef } from 'react'

const milestones = [
  { date: 'Sep 2025', title: 'The Spark', text: 'We asked: "What if AI didn\'t just suggest — but actually built?" One developer, one CLI, one mission.' },
  { date: 'Nov 2025', title: 'First Agent', text: 'JARVIS v0.1 — could plan, write, and test code autonomously. No IDE needed. Terminal-first.' },
  { date: 'Jan 2026', title: '4-Layer Memory', text: 'Working, semantic, episodic, and vector memory. JARVIS started remembering — across sessions, projects, and weeks.' },
  { date: 'Mar 2026', title: 'Public Launch', text: 'Open-sourced on GitHub. 25+ tools, multi-provider AI, skill marketplace, and the web dashboard. Free for everyone.' },
  { date: 'Today', title: 'AGI-Level Dev', text: 'Full end-to-end autonomy. Research, plan, build, test, deploy — all from a single command.' },
]

const principles = [
  { icon: '🔓', title: 'Open Source First', text: 'MIT licensed. Every line of CLI code is on GitHub. Fork it, modify it, own it. We believe the best tools should be free.' },
  { icon: '🔒', title: 'Privacy by Default', text: 'Your code never leaves your machine. With Ollama, even AI runs locally. Zero cloud dependency,zero data sharing.' },
  { icon: '🧠', title: 'Intelligence, Not Imitation', text: 'JARVIS doesn\'t generate boilerplate. It understands your project, remembers your preferences, and writes code you\'d actually ship.' },
  { icon: '⚡', title: 'Developer Experience', text: 'No complex setup. No YAML configs. npm install, type a command, watch it work. That\'s it.' },
]

const techStack = [
  { layer: 'CLI', items: ['Node.js / TypeScript', 'Ink for terminal UI', 'Streaming responses'], color: '#00a8ff' },
  { layer: 'AI Engine', items: ['Gemini 2.5 Pro', 'GPT-4', 'Claude', 'Ollama (local)'], color: '#00e87b' },
  { layer: 'Memory', items: ['SQLite (working)', 'Vector store', 'Episodic log', 'Semantic graph'], color: '#a855f7' },
  { layer: 'Tools', items: ['25+ built-in', 'MCP protocol', 'Skill marketplace', 'Browser control'], color: '#ffbd2e' },
  { layer: 'Infra', items: ['Supabase', 'Vercel', 'LemonSqueezy', 'WebSocket gateway'], color: '#ff5f56' },
]

function TimelineItem({ milestone, index }: { milestone: typeof milestones[0]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.7 }}
      style={{
        display: 'flex', gap: '2rem', alignItems: 'flex-start',
        marginBottom: '3rem', position: 'relative',
      }}
    >
      {/* Date pill */}
      <div style={{
        minWidth: 100, padding: '0.4rem 0.8rem', borderRadius: 8,
        background: 'rgba(0, 168, 255, 0.08)', border: '1px solid rgba(0, 168, 255, 0.15)',
        fontSize: '0.75rem', fontWeight: 700, color: '#00a8ff',
        textAlign: 'center', flexShrink: 0,
      }}>
        {milestone.date}
      </div>

      {/* Dot + line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 4 }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: milestone.date === 'Today'
            ? 'linear-gradient(135deg, #00a8ff, #00e87b)'
            : 'rgba(0, 168, 255, 0.3)',
          boxShadow: milestone.date === 'Today' ? '0 0 12px rgba(0, 168, 255, 0.5)' : 'none',
        }} />
        {index < milestones.length - 1 && (
          <div style={{ width: 2, flexGrow: 1, minHeight: 40, background: 'rgba(30, 30, 46, 0.6)' }} />
        )}
      </div>

      {/* Content */}
      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f5', marginBottom: '0.35rem' }}>
          {milestone.title}
        </h3>
        <p style={{ color: '#8888a0', fontSize: '0.95rem', lineHeight: 1.6 }}>{milestone.text}</p>
      </div>
    </motion.div>
  )
}

export default function AboutPage() {
  useEffect(() => { document.title = 'JARVIS — About' }, [])

  return (
    <>
      {/* ════════ HERO ════════ */}
      <section style={{
        padding: '11rem 1.5rem 6rem', textAlign: 'center', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(0, 168, 255, 0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <h1 style={{
            fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
            fontWeight: 900, color: '#f0f0f5', lineHeight: 1.05,
            marginBottom: '1.5rem', maxWidth: 700, margin: '0 auto 1.5rem',
          }}>
            We're Building The<br />
            <span style={{
              background: 'linear-gradient(135deg, #00a8ff, #a855f7)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Future of Development
            </span>
          </h1>
          <p style={{
            color: '#8888a0', fontSize: '1.25rem', maxWidth: 600,
            margin: '0 auto', lineHeight: 1.7,
          }}>
            JARVIS was born from a simple belief: developers shouldn't waste time on tasks a machine can handle better, faster, and more reliably.
          </p>
        </motion.div>
      </section>

      {/* ════════ TIMELINE ════════ */}
      <section style={{ padding: '2rem 1.5rem 6rem' }}>
        <div style={{ maxWidth: 800, width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#f0f0f5', textAlign: 'center', marginBottom: '4rem' }}>
            Our Journey
          </h2>
          {milestones.map((m, i) => (
            <TimelineItem key={m.title} milestone={m} index={i} />
          ))}
        </div>
      </section>

      {/* ════════ PRINCIPLES ════════ */}
      <section style={{
        padding: '6rem 1.5rem',
        borderTop: '1px solid rgba(30, 30, 46, 0.4)',
        borderBottom: '1px solid rgba(30, 30, 46, 0.4)',
        background: 'rgba(5, 5, 8, 0.5)',
      }}>
        <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f0f0f5', textAlign: 'center', marginBottom: '1rem' }}>
            Our <span style={{ color: '#00a8ff' }}>Principles</span>
          </h2>
          <p style={{ color: '#8888a0', fontSize: '1.1rem', textAlign: 'center', maxWidth: 500, margin: '0 auto 4rem' }}>
            The non-negotiable beliefs that guide every decision we make.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            {principles.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                style={{
                  padding: '2rem', borderRadius: 16,
                  background: 'rgba(10, 10, 16, 0.6)',
                  border: '1px solid rgba(30, 30, 46, 0.5)',
                  transition: 'border-color 0.3s, transform 0.3s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget).style.borderColor = 'rgba(0, 168, 255, 0.3)';
                  (e.currentTarget).style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget).style.borderColor = 'rgba(30, 30, 46, 0.5)';
                  (e.currentTarget).style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block' }}>{p.icon}</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f0f0f5', marginBottom: '0.5rem' }}>{p.title}</h3>
                <p style={{ color: '#8888a0', fontSize: '0.95rem', lineHeight: 1.6 }}>{p.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ TECH STACK ════════ */}
      <section style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f0f0f5', textAlign: 'center', marginBottom: '1rem' }}>
            Under The Hood
          </h2>
          <p style={{ color: '#8888a0', fontSize: '1.1rem', textAlign: 'center', maxWidth: 500, margin: '0 auto 4rem' }}>
            The architecture behind AGI-level development.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
            {techStack.map((stack, i) => (
              <motion.div
                key={stack.layer}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                style={{
                  padding: '1.5rem', borderRadius: 16,
                  background: 'rgba(10, 10, 16, 0.6)',
                  border: '1px solid rgba(30, 30, 46, 0.5)',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: stack.color, marginBottom: '1rem',
                }}>
                  {stack.layer}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {stack.items.map((item) => (
                    <span key={item} style={{ fontSize: '0.8rem', color: '#8888a0' }}>{item}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ OPEN SOURCE CTA ════════ */}
      <section style={{
        padding: '8rem 1.5rem', textAlign: 'center',
        background: 'radial-gradient(ellipse at center, rgba(0, 232, 123, 0.04) 0%, transparent 60%)',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ maxWidth: 700, margin: '0 auto' }}
        >
          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 900, color: '#f0f0f5', marginBottom: '1.5rem', lineHeight: 1.1,
          }}>
            Open Source.<br />
            <span style={{ color: '#00e87b' }}>Community Driven.</span>
          </h2>
          <p style={{ color: '#8888a0', fontSize: '1.15rem', marginBottom: '2.5rem', lineHeight: 1.7 }}>
            JARVIS is MIT licensed. Fork it, modify it, contribute to it.
            We believe the best developer tools should be free and built by the community.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://github.com/personaljarvis/jarvis" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '1rem 2.5rem', background: 'rgba(17, 17, 24, 0.8)',
              color: '#f0f0f5', fontWeight: 600, fontSize: '1.1rem',
              borderRadius: 12, textDecoration: 'none',
              border: '1px solid rgba(30, 30, 46, 0.8)',
            }}>
              ⭐ Star on GitHub
            </a>
            <a href="https://app.letjarvis.com/signup" style={{
              display: 'inline-flex', background: 'linear-gradient(135deg, #00a8ff, #00e87b)',
              color: '#022c22', fontWeight: 700, fontSize: '1.1rem',
              padding: '1rem 2.5rem', borderRadius: 12, textDecoration: 'none',
            }}>
              Get Started Free →
            </a>
          </div>
        </motion.div>
      </section>
    </>
  )
}

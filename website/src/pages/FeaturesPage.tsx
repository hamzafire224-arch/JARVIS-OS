import { motion } from 'framer-motion'
import { useEffect } from 'react'
import Features from '../sections/Features'

const detailedFeatures = [
  {
    title: 'Autonomous Research',
    icon: '🔍',
    description: 'JARVIS crawls documentation, reads entire codebases, and synthesizes findings into actionable insights. Point it at a GitHub repo and ask a question — it\'ll read every file to find the answer.',
    highlights: ['Crawls docs, repos, and APIs', 'Synthesizes findings automatically', 'Cites sources with line references'],
    align: 'left' as const,
  },
  {
    title: '4-Layer Memory System',
    icon: '🧠',
    description: 'Unlike other AI tools that forget everything between sessions, JARVIS maintains four layers of persistent memory. It remembers your coding style, project context, and past decisions.',
    highlights: ['Working memory for active context', 'Semantic memory for long-term knowledge', 'Episodic memory for session recall', 'Vector search for similarity matching'],
    align: 'right' as const,
  },
  {
    title: 'One-Click Deployment',
    icon: '🚀',
    description: 'From code to production in a single command. JARVIS generates CI/CD pipelines, configures hosting, and deploys — automatically adapting to your stack.',
    highlights: ['Auto-detects frameworks (Next.js, Vite, etc.)', 'Generates GitHub Actions, Docker configs', 'Deploys to Vercel, Railway, or custom servers'],
    align: 'left' as const,
  },
  {
    title: 'Voice Interface',
    icon: '🎤',
    description: 'Speak to JARVIS naturally. Full voice command support with wake word detection, streaming transcription, and real-time responses. Hands-free coding at its finest.',
    highlights: ['Wake word detection ("Hey JARVIS")', 'Streaming voice recognition', 'Natural language task execution'],
    align: 'right' as const,
  },
  {
    title: 'Security Framework',
    icon: '🛡️',
    description: 'Enterprise-grade security built into every layer. Sandboxed execution prevents rogue commands, and every action is logged for full auditability.',
    highlights: ['Sandboxed command execution', 'Command validation & threat detection', 'Full audit logging', 'Dangerous action confirmation'],
    align: 'left' as const,
  },
  {
    title: 'Skill Marketplace',
    icon: '🏪',
    description: 'Extend JARVIS with community-built skills. Install new capabilities in one click, or create and share your own. The marketplace grows every day.',
    highlights: ['One-click skill installation', 'Community-created extensions', 'Build and publish your own skills'],
    align: 'right' as const,
  },
]

export default function FeaturesPage() {
  useEffect(() => { document.title = 'JARVIS — Features' }, [])

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
            Every <span style={{ color: '#00a8ff' }}>Feature</span>, Detailed
          </h1>
          <p style={{
            color: '#8888a0',
            fontSize: '1.2rem',
            maxWidth: 600,
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            Explore what makes JARVIS the most capable autonomous AI agent available.
          </p>
        </motion.div>
      </section>

      {/* Quick Grid (from home page section) */}
      <Features />

      {/* Detailed Feature Sections */}
      <section style={{ padding: '4rem 1.5rem 8rem' }}>
        <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.25rem',
            fontWeight: 700,
            color: '#f0f0f5',
            textAlign: 'center',
            marginBottom: '5rem',
          }}>
            Deep Dive
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5rem' }}>
            {detailedFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7 }}
                style={{
                  display: 'flex',
                  flexDirection: feature.align === 'right' ? 'row-reverse' : 'row',
                  gap: '3rem',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                {/* Icon block */}
                <div style={{
                  flex: '0 0 auto',
                  width: 120,
                  height: 120,
                  borderRadius: 24,
                  background: 'rgba(0, 168, 255, 0.06)',
                  border: '1px solid rgba(0, 168, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3rem',
                }}>
                  {feature.icon}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 280 }}>
                  <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#f0f0f5',
                    marginBottom: '1rem',
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    color: '#8888a0',
                    fontSize: '1.05rem',
                    lineHeight: 1.7,
                    marginBottom: '1.5rem',
                  }}>
                    {feature.description}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {feature.highlights.map((h) => (
                      <li key={h} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                        <span style={{ color: '#00e87b', fontSize: '0.8rem' }}>✓</span>
                        <span style={{ color: '#cbd5e1' }}>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

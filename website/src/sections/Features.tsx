import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const features = [
  {
    icon: '🔗',
    title: 'Seamless API Integrations',
    description: 'Connect to any service via MCP protocol. GitHub, databases, cloud providers — all unified under one interface.',
  },
  {
    icon: '🔍',
    title: 'Autonomous Research',
    description: 'JARVIS crawls documentation, analyzes codebases, and synthesizes findings without you lifting a finger.',
  },
  {
    icon: '🚀',
    title: 'One-Click Deployment',
    description: 'From code to production in a single command. CI/CD pipelines built and configured automatically.',
  },
  {
    icon: '🧠',
    title: '4-Layer Memory',
    description: 'Working, semantic, episodic, and vector memory. JARVIS remembers your preferences and project context across sessions.',
  },
  {
    icon: '🛡️',
    title: 'Security Framework',
    description: 'Sandboxed execution, command validation, and audit logging. Enterprise-grade protection built in.',
  },
  {
    icon: '🏪',
    title: 'Skill Marketplace',
    description: 'Install and share custom skills. Community-driven extensions that expand JARVIS capabilities infinitely.',
  },
  {
    icon: '🎤',
    title: 'Voice Interface',
    description: 'Talk to JARVIS. Full voice command support with wake word detection and streaming responses.',
  },
  {
    icon: '🖥️',
    title: 'Runs Locally',
    description: 'Use Ollama for 100% offline AI. Your data never leaves your machine. Zero cloud dependency.',
  },
  {
    icon: '⚡',
    title: 'Multi-Provider Support',
    description: 'Gemini, GPT-4, Claude, or local models. Switch providers per task or set your preferred default.',
  },
]

export default function Features() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="features" ref={ref} style={{ padding: '8rem 1.5rem' }}>
      <div style={{ maxWidth: 1300, width: '100%', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 800, marginBottom: '1rem', color: '#f0f0f5' }}>
            Built for <span className="text-accent">Serious</span> Work
          </h2>
          <p style={{ color: '#8888a0', fontSize: '1.125rem', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
            Not a toy. A production-grade autonomous agent with enterprise capabilities.
          </p>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}>
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.08 * i }}
              className="bento-card"
              style={{
                background: 'rgba(10, 10, 16, 0.6)',
                borderRadius: 16,
                padding: '1.75rem',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{feature.icon}</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f0f0f5', marginBottom: '0.5rem' }}>{feature.title}</h3>
              <p style={{ fontSize: '0.875rem', color: '#8888a0', lineHeight: 1.6 }}>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

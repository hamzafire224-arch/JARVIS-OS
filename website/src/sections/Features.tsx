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
    <section id="features" ref={ref} className="py-32 md:py-44 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Built for <span className="text-accent">Serious</span> Work
          </h2>
          <p className="text-text-secondary text-lg max-w-xl mx-auto">
            Not a toy. A production-grade autonomous agent with enterprise capabilities.
          </p>
        </motion.div>

        {/* Even 3-column grid — NO force-fitting, NO col-span-2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.08 * i }}
              className="bento-card bg-surface-2 rounded-2xl p-6"
            >
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-base font-semibold text-text-primary mb-2">{feature.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

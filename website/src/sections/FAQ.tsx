import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'

const faqs = [
  {
    q: 'Is my data secure?',
    a: 'Absolutely. JARVIS runs locally on your machine. With Ollama, your data never leaves your computer. Even with cloud providers, we use encrypted connections and never store your code or prompts. The built-in security framework sandboxes all operations and maintains full audit logs.',
  },
  {
    q: 'What AI models does it support?',
    a: 'JARVIS supports Gemini 2.5 Pro, GPT-4, Claude, and any Ollama-compatible local model (Llama, Mistral, CodeLlama, etc.). You can switch providers per task or set a default. Local models mean zero API costs.',
  },
  {
    q: 'How is this different from GitHub Copilot?',
    a: 'Copilot suggests code completions. JARVIS is an autonomous agent that plans, researches, writes, tests, and deploys your entire project end-to-end. It has persistent memory, tool integrations, and can operate independently while you focus on other things.',
  },
  {
    q: 'Can I use it for commercial projects?',
    a: 'Yes. JARVIS is MIT licensed for the CLI, and there are no restrictions on what you build with it. Your code belongs entirely to you.',
  },
  {
    q: 'Does it work offline?',
    a: 'Yes. With Ollama and a local model, JARVIS works completely offline with zero internet dependency. The only features that require internet are cloud AI providers and license validation (checked weekly).',
  },
  {
    q: 'Is JARVIS really free?',
    a: 'Yes. JARVIS is free and open source. The Balanced plan is free forever using local AI via Ollama. The Productivity plan (cloud AI + full memory + all skills) is also free to get started — just sign up and start building.',
  },
]

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      style={{ borderBottom: '1px solid rgba(30, 30, 46, 0.6)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.5rem 0',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#f0f0f5',
        }}
      >
        <span style={{ fontSize: '1.1rem', fontWeight: 500, paddingRight: '1rem', transition: 'color 0.2s' }}>
          {faq.q}
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ fontSize: '1.5rem', color: '#55556a', flexShrink: 0 }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{ color: '#8888a0', fontSize: '1rem', lineHeight: 1.7, paddingBottom: '1.5rem' }}>
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FAQ() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="faq" ref={ref} style={{ padding: '8rem 1.5rem' }}>
      <div style={{ maxWidth: 900, width: '100%', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 800, marginBottom: '1rem', color: '#f0f0f5' }}>
            Questions? <span className="text-accent">Answered.</span>
          </h2>
        </motion.div>

        {isInView && (
          <div>
            {faqs.map((faq, i) => (
              <FAQItem key={i} faq={faq} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

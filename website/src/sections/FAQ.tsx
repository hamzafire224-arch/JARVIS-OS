import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'

const faqs = [
  {
    q: 'Is my data secure?',
    a: 'Absolutely. JARVIS runs locally on your machine. With Ollama, your data never leaves your computer. Even with cloud providers, we use encrypted connections and never store your code or prompts. The built-in security framework sandboxes all operations and maintains full audit logs.',
  },
  {
    q: 'How much does it cost?',
    a: 'JARVIS is completely free during our launch period — including the full Productivity plan. After the launch period, the Balanced plan stays free forever (local AI via Ollama). The Productivity plan (cloud AI + full memory + priority support) will be $20/month.',
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
]

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="border-b border-border"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-base md:text-lg font-medium text-text-primary group-hover:text-accent transition-colors pr-4">
          {faq.q}
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-xl text-text-tertiary flex-shrink-0"
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
            className="overflow-hidden"
          >
            <p className="text-text-secondary text-sm md:text-base leading-relaxed pb-5">
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
    <section id="faq" ref={ref} className="py-32 md:py-44 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
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

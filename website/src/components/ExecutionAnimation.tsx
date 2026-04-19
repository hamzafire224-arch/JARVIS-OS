import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ExecutionAnimation() {
  const [phase, setPhase] = useState<'typing' | 'running' | 'done'>('typing')
  const [typedText, setTypedText] = useState('')
  const [logs, setLogs] = useState<string[]>([])

  const fullText = "jarvis, build me a SaaS dashboard..."

  const executionLogs = [
    "[System] Analyzing prompt intent...",
    "[Research] Scanning database for standard UI patterns...",
    "[Architect] Designing PostgreSQL standard schema...",
    "[Engineer] Scaffolding Next.js App Router components...",
    "[Engineer] Writing authentication logic...",
    "[DevOps] Provisioning Vercel edge deployment...",
    "[System] Verifying builds and testing endpoints...",
    "[Success] Deployment completed. Returning dashboard UI."
  ]

  // Typing effect
  useEffect(() => {
    if (phase !== 'typing') return

    let currentLength = 0
    const typingInterval = setInterval(() => {
      currentLength++
      setTypedText(fullText.slice(0, currentLength))

      if (currentLength >= fullText.length) {
        clearInterval(typingInterval)
        setTimeout(() => setPhase('running'), 600)
      }
    }, 50)

    return () => clearInterval(typingInterval)
  }, [phase, fullText])

  // Execution effect
  useEffect(() => {
    if (phase !== 'running') return

    let currentLog = 0
    const logInterval = setInterval(() => {
      if (currentLog < executionLogs.length) {
        setLogs(prev => [...prev, executionLogs[currentLog]])
        currentLog++
      } else {
        clearInterval(logInterval)
        setTimeout(() => setPhase('done'), 1000)
      }
    }, 400) // Fast rapid logs

    return () => clearInterval(logInterval)
  }, [phase, executionLogs])

  // Reset loop
  useEffect(() => {
    if (phase === 'done') {
      const resetTimer = setTimeout(() => {
        setTypedText('')
        setLogs([])
        setPhase('typing')
      }, 4000)
      return () => clearTimeout(resetTimer)
    }
  }, [phase])

  return (
    <div className="relative w-full max-w-xl mx-auto flex flex-col items-center mt-6">
      <AnimatePresence mode="wait">
        {phase === 'typing' && (
          <motion.div
            key="input-bar"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="w-full bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-2xl px-6 py-4 flex items-center gap-3 shadow-xl"
          >
            <span className="text-accent text-lg">❯</span>
            <span className="text-text-tertiary text-sm font-mono">{typedText}</span>
            <span className="typing-cursor ml-1" />
          </motion.div>
        )}

        {(phase === 'running' || phase === 'done') && (
          <motion.div
            key="terminal"
            initial={{ opacity: 0, height: 60 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-border-light rounded-xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Terminal Header */}
            <div className="flex items-center px-4 py-2 border-b border-white/[0.05] bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              </div>
              <span className="text-text-tertiary text-[10px] font-mono tracking-widest uppercase ml-auto">JARVIS Execution</span>
            </div>

            {/* Terminal Body */}
            <div className="p-4 space-y-2 font-mono text-xs sm:text-sm text-text-secondary h-[180px] overflow-hidden flex flex-col justify-end relative">
              <AnimatePresence>
                {logs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex gap-2 ${log.startsWith('[Success]') ? 'text-green-400 font-semibold' : ''}`}
                  >
                    <span className="text-accent opacity-70">❯</span>
                    {log}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Green overlay on finish */}
              {phase === 'done' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="absolute inset-0 bg-gradient-to-t from-green-500/10 to-transparent pointer-events-none"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

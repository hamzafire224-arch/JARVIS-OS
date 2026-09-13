import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const AGENT_TASKS = [
  {
    id: 'research',
    title: 'Analyst Agent',
    icon: '🧠',
    task: 'Researching GitHub for modern tech stacks...',
    color: 'from-blue-500/20 to-blue-600/5',
    borderColor: 'border-blue-500/30'
  },
  {
    id: 'architect',
    title: 'Architect Agent',
    icon: '📐',
    task: 'Designing Supabase PostgreSQL schema...',
    color: 'from-indigo-500/20 to-indigo-600/5',
    borderColor: 'border-indigo-500/30'
  },
  {
    id: 'developer',
    title: 'Engineer Agent',
    icon: '⚡',
    task: 'Scaffolding Next.js App Router components...',
    color: 'from-accent/20 to-accent-bright/5',
    borderColor: 'border-accent/30'
  },
  {
    id: 'devops',
    title: 'DevOps Agent',
    icon: '🚀',
    task: 'Pushing to GitHub & Vercel deployment...',
    color: 'from-cyan-500/20 to-cyan-600/5',
    borderColor: 'border-cyan-500/30'
  }
]

export default function MultiAgentHero() {
  const [phase, setPhase] = useState<'typing' | 'collaborating' | 'done'>('typing')
  const [typedText, setTypedText] = useState('')
  const [activeAgent, setActiveAgent] = useState(0)

  const fullText = "Jarvis, build me a complete SaaS backend and dashboard..."

  // Typing effect
  useEffect(() => {
    if (phase !== 'typing') return

    let currentLength = 0
    const typingInterval = setInterval(() => {
      currentLength++
      setTypedText(fullText.slice(0, currentLength))

      if (currentLength >= fullText.length) {
        clearInterval(typingInterval)
        setTimeout(() => setPhase('collaborating'), 800) // Small pause before exploding out
      }
    }, 45)

    return () => clearInterval(typingInterval)
  }, [phase, fullText])

  // Carousel cycle
  useEffect(() => {
    if (phase !== 'collaborating') return

    const cycleInterval = setInterval(() => {
      setActiveAgent((prev) => {
        const next = prev + 1
        if (next >= AGENT_TASKS.length) {
          setTimeout(() => {
            setPhase('done')
          }, 1500)
          return prev // stay on last indicator
        }
        return next
      })
    }, 2200)

    return () => clearInterval(cycleInterval)
  }, [phase])

  // Reset loop
  useEffect(() => {
    if (phase === 'done') {
      const resetTimer = setTimeout(() => {
        setTypedText('')
        setActiveAgent(0)
        setPhase('typing')
      }, 3000)
      return () => clearTimeout(resetTimer)
    }
  }, [phase])

  return (
    <div className="relative w-full max-w-2xl mx-auto h-[300px] flex items-center justify-center mt-8">
      
      {/* Central Input Bar */}
      <AnimatePresence mode="wait">
        {phase === 'typing' && (
          <motion.div
            key="input-bar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            transition={{ duration: 0.5 }}
            className="w-full bg-surface/80 backdrop-blur-md border border-white/[0.08] rounded-2xl px-6 py-5 flex items-center gap-4 shadow-2xl"
          >
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 border border-accent/20">
              <span className="text-xl">🎙️</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-text-primary text-base sm:text-lg font-mono whitespace-nowrap overflow-hidden text-left">
                {typedText}
                <span className="inline-block w-2 bg-accent h-5 ml-1 animate-pulse align-middle" />
              </p>
            </div>
          </motion.div>
        )}

        {(phase === 'collaborating' || phase === 'done') && (
          <motion.div
            key="agent-cluster"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full h-full relative flex items-center justify-center"
          >
            {/* Core glowing JARVIS brain in center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
              <div className="w-16 h-16 rounded-full bg-accent/20 blur-xl animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-accent relative z-10 shadow-[0_0_30px_rgba(0,168,255,0.8)]" />
              
              {/* Spinning connection ring */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/[0.03] border-t-accent/40 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/[0.02] border-b-accent/20 rounded-full animate-spin" style={{ animationDuration: '5s', animationDirection: 'reverse' }} />
            </div>

            {/* Rotating Agent Cards */}
            {AGENT_TASKS.map((agent, index) => {
              const isActive = index === activeAgent && phase === 'collaborating';
              const isPast = index < activeAgent;
              const isFuture = index > activeAgent;
              
              let yOffset = 0;
              let scale = 1;
              let opacity = 1;
              let blur = 0;
              let zIndex = 10;

              if (isActive) {
                yOffset = 0;
                scale = 1;
                opacity = 1;
                zIndex = 20;
              } else if (isPast) {
                yOffset = -80;
                scale = 0.85;
                opacity = 0;
                blur = 10;
                zIndex = 5;
              } else if (isFuture) {
                yOffset = 80;
                scale = 0.85;
                opacity = 0;
                blur = 10;
                zIndex = 5;
              }

              if (phase === 'done') {
                 scale = 0.5;
                 opacity = 0;
              }

              return (
                <motion.div
                  key={agent.id}
                  animate={{ y: yOffset, scale, opacity, filter: `blur(${blur}px)` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className={`absolute z-${zIndex} w-full max-w-lg bg-surface/90 backdrop-blur-xl border ${agent.borderColor} rounded-2xl p-5 shadow-2xl flex items-center gap-4`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.color} border ${agent.borderColor} flex items-center justify-center text-2xl flex-shrink-0 shadow-inner`}>
                    {agent.icon}
                  </div>
                  <div className="text-left w-full">
                    <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider">{agent.title}</h4>
                    <p className="text-text-secondary text-sm font-mono mt-1 flex items-center gap-2 overflow-hidden truncate">
                       {agent.task}
                       {isActive && <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />}
                    </p>
                  </div>
                </motion.div>
              )
            })}
            
            {/* The Done State Badge */}
            <AnimatePresence>
                {phase === 'done' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: 0.3 }}
                      className="absolute z-30 bg-green-500/10 border border-green-500/30 backdrop-blur-md px-8 py-4 rounded-full flex items-center gap-3 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                    >
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">✓</div>
                      <span className="text-green-400 font-bold tracking-wide">Deployment Complete</span>
                    </motion.div>
                )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const snippetSQL = `CREATE TABLE users (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  billing_tier text DEFAULT 'free',
  created_at timestamp DEFAULT now()
);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own data" ON users...`

const snippetTSX = `import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function Dashboard() {
  const cookieStore = cookies()
  const supabase = createServerClient(process.env.URL, process.env.KEY, { cookies: () => cookieStore })
  const { data: { session } } = await supabase.auth.getSession()

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8">
      <MetricCard title="Total Revenue" value="$12,450" trend="+14%" />
      <ActivityFeed userId={session?.user.id} />
    </div>
  )
}`

function useTypingEffect(text: string, speed: number, trigger: boolean) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    if (!trigger) {
      setDisplayed('')
      return
    }
    let i = 0
    // Type multiple characters at once to simulate fast AI generation
    const interval = setInterval(() => {
      i += 8 
      setDisplayed(text.slice(0, i))
      if (i >= text.length) clearInterval(interval)
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed, trigger])
  return displayed
}

export default function ExecutionAnimation() {
  const [phase, setPhase] = useState<'typing' | 'running' | 'done'>('typing')
  const [typedPrompt, setTypedPrompt] = useState('')
  
  const [activeTab, setActiveTab] = useState<'sql' | 'tsx'>('sql')
  const [files, setFiles] = useState<string[]>([])

  const fullPrompt = "jarvis, build a SaaS dashboard with Supabase auth..."

  // Phase 1: Typing the prompt
  useEffect(() => {
    if (phase !== 'typing') return
    let i = 0
    const interval = setInterval(() => {
      i++
      setTypedPrompt(fullPrompt.slice(0, i))
      if (i >= fullPrompt.length) {
        clearInterval(interval)
        setTimeout(() => setPhase('running'), 600)
      }
    }, 45)
    return () => clearInterval(interval)
  }, [phase])

  // Phase 2: IDE Execution simulation
  useEffect(() => {
    if (phase !== 'running') return

    // Timeline of JARVIS creating files
    const timeouts = [
      setTimeout(() => {
        setFiles(['schema.sql'])
        setActiveTab('sql')
      }, 300),
      setTimeout(() => {
        setFiles(['schema.sql', 'Dashboard.tsx'])
        setActiveTab('tsx')
      }, 2500),
      setTimeout(() => {
        setFiles(['schema.sql', 'Dashboard.tsx', 'route.ts'])
      }, 5000),
      setTimeout(() => setPhase('done'), 6500)
    ]

    return () => timeouts.forEach(clearTimeout)
  }, [phase])

  const typedSQL = useTypingEffect(snippetSQL, 20, activeTab === 'sql' && phase === 'running')
  const typedTSX = useTypingEffect(snippetTSX, 20, activeTab === 'tsx' && phase === 'running')

  // Phase 3: Reset after done
  useEffect(() => {
    if (phase === 'done') {
      const reset = setTimeout(() => {
        setTypedPrompt('')
        setFiles([])
        setPhase('typing')
      }, 4000)
      return () => clearTimeout(reset)
    }
  }, [phase])

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center mt-8">
      <AnimatePresence mode="wait">
        
        {/* State 1: The Glassmorphic Input */}
        {phase === 'typing' && (
          <motion.div
            key="input-bar"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="w-full bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-2xl px-6 py-4 flex items-center gap-4 shadow-2xl"
          >
            <div className="w-8 h-8 rounded-full bg-accent/20 flex flex-shrink-0 items-center justify-center border border-accent/30 shadow-[0_0_15px_rgba(0,168,255,0.4)]">
              <span className="text-accent text-sm font-bold">J</span>
            </div>
            <span className="text-text-primary text-base font-mono tracking-wide">{typedPrompt}</span>
            <span className="w-2 h-5 bg-accent animate-pulse ml-0.5" />
          </motion.div>
        )}

        {/* State 2: High-End IDE Simulator */}
        {(phase === 'running' || phase === 'done') && (
          <motion.div
            key="ide-window"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full bg-[#0a0a0a]/90 backdrop-blur-3xl border border-[#333] rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col h-[280px]"
          >
            {/* IDE Header */}
            <div className="h-10 bg-[#151515] border-b border-[#333] flex items-center px-4 relative">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(0,168,255,0.8)]" />
                <span className="text-white/40 text-xs font-mono">jarvis_workspace — Autonomous Mode</span>
              </div>
            </div>

            {/* IDE Body */}
            <div className="flex flex-1 overflow-hidden relative">
              
              {/* Sidebar: File Tree */}
              <div className="w-[160px] bg-[#0c0c0c] border-r border-[#222] p-3 text-xs font-mono text-white/50 space-y-3">
                <div className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-4">Explorer</div>
                <AnimatePresence>
                  {files.map((file) => (
                    <motion.div
                      key={file}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={\`flex items-center gap-2 cursor-default \${(file === 'schema.sql' && activeTab === 'sql') || (file === 'Dashboard.tsx' && activeTab === 'tsx') ? 'text-accent' : 'text-white/60'}\`}
                    >
                      <span className="w-4 h-4 text-[10px] flex items-center justify-center bg-white/[0.05] rounded">
                         {file.endsWith('.sql') ? '🐘' : '⚛'}
                      </span>
                      {file}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Main Code Editor */}
              <div className="flex-1 p-5 overflow-hidden text-left relative">
                {/* Agent Activity Badge */}
                <div className="absolute top-3 right-4 bg-accent/10 border border-accent/20 px-3 py-1 rounded-full flex items-center gap-2">
                  <span className="text-accent text-[10px] uppercase font-bold tracking-widest">
                    {activeTab === 'sql' ? 'Architect Agent' : 'Engineer Agent'}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                </div>

                <div className="font-mono text-[11px] sm:text-xs leading-relaxed text-blue-300 whitespace-pre">
                  {activeTab === 'sql' ? typedSQL : typedTSX}
                </div>
              </div>

              {/* Done Overlay */}
              <AnimatePresence>
                {phase === 'done' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm flex items-center justify-center z-10"
                  >
                    <div className="bg-[#111] border border-green-500/30 px-8 py-5 rounded-2xl flex flex-col items-center gap-3 shadow-[0_0_50px_rgba(34,197,94,0.15)]">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <span className="text-green-400 text-xl font-bold">✓</span>
                      </div>
                      <span className="text-white text-sm font-semibold tracking-wide">Project Successfully Scaffolded</span>
                      <a href="#" className="text-accent text-xs font-mono hover:underline">localhost:3000 opened in browser ↗</a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

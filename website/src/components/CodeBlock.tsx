import { useEffect, useState } from 'react'

interface TermLine {
  text: string
  type: 'prompt' | 'info' | 'success' | 'dim' | 'accent' | 'blank'
  delay?: number // ms after previous line
}

const terminalLines: TermLine[] = [
  { text: '❯ jarvis build a SaaS dashboard with auth', type: 'prompt', delay: 0 },
  { text: '', type: 'blank', delay: 300 },
  { text: '⚡ JARVIS v2.5 — Autonomous Mode', type: 'accent', delay: 200 },
  { text: '', type: 'blank', delay: 100 },
  { text: '→ Analyzing requirements...', type: 'info', delay: 400 },
  { text: '→ Planning architecture (7 modules)', type: 'info', delay: 600 },
  { text: '→ Researching best practices...', type: 'info', delay: 500 },
  { text: '', type: 'blank', delay: 200 },
  { text: '✓ Created  src/auth/login.tsx', type: 'success', delay: 300 },
  { text: '✓ Created  src/auth/signup.tsx', type: 'success', delay: 180 },
  { text: '✓ Created  src/dashboard/layout.tsx', type: 'success', delay: 180 },
  { text: '✓ Created  src/dashboard/analytics.tsx', type: 'success', delay: 180 },
  { text: '✓ Created  src/api/routes.ts', type: 'success', delay: 180 },
  { text: '✓ Created  src/db/schema.sql', type: 'success', delay: 180 },
  { text: '✓ Created  src/middleware/auth.ts', type: 'success', delay: 180 },
  { text: '', type: 'blank', delay: 300 },
  { text: '→ Running test suite...', type: 'info', delay: 500 },
  { text: '✓ 23 tests passing (0 failures)', type: 'success', delay: 600 },
  { text: '', type: 'blank', delay: 200 },
  { text: '→ Deploying to production...', type: 'info', delay: 500 },
  { text: '✓ Live at yourproject.vercel.app', type: 'success', delay: 800 },
  { text: '', type: 'blank', delay: 200 },
  { text: '⚡ Done — 7 files, 23 tests, deployed.', type: 'accent', delay: 300 },
]

const colorMap: Record<TermLine['type'], string> = {
  prompt: 'text-text-primary font-semibold',
  info: 'text-text-secondary',
  success: 'text-success',
  dim: 'text-text-tertiary',
  accent: 'text-accent-bright',
  blank: '',
}

export default function CodeBlock() {
  const [visibleLines, setVisibleLines] = useState(0)

  useEffect(() => {
    if (visibleLines >= terminalLines.length) return

    const nextDelay = terminalLines[visibleLines]?.delay ?? 180

    const timeout = setTimeout(() => {
      setVisibleLines((prev) => prev + 1)
    }, nextDelay)

    return () => clearTimeout(timeout)
  }, [visibleLines])

  return (
    <div className="bg-surface-2 border border-border rounded-xl p-5 font-mono text-sm max-w-lg w-full shadow-2xl">
      {/* Header dots */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-error/60" />
        <div className="w-3 h-3 rounded-full bg-[#ffaa00]/60" />
        <div className="w-3 h-3 rounded-full bg-success/60" />
        <span className="ml-3 text-xs text-text-tertiary">JARVIS Terminal</span>
      </div>
      {/* Terminal output */}
      <div className="space-y-0.5">
        {terminalLines.slice(0, visibleLines).map((line, i) => (
          <div key={i} className="min-h-[1.3em]">
            <span className={colorMap[line.type]}>
              {line.text}
            </span>
          </div>
        ))}
        {visibleLines < terminalLines.length && (
          <div className="min-h-[1.3em]">
            <span className="typing-cursor text-text-secondary" />
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'

const codeLines = [
  '// Autonomous task execution engine',
  'const jarvis = new JarvisAgent({',
  '  model: "gemini-2.5-pro",',
  '  memory: new FourLayerMemory(),',
  '  security: SecurityFramework.strict(),',
  '});',
  '',
  'await jarvis.execute({',
  '  task: "Build the entire API layer",',
  '  autonomous: true,',
  '  tools: ["filesystem", "terminal", "git"],',
  '});',
  '',
  '// ✓ 14 files created',
  '// ✓ 47 tests passing',
  '// ✓ Deployed to production',
]

export default function CodeBlock() {
  const [visibleLines, setVisibleLines] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= codeLines.length) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 180)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-surface-2 border border-border rounded-xl p-5 font-mono text-sm max-w-lg w-full shadow-2xl">
      {/* Header dots */}
      <div className="flex gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-error/60" />
        <div className="w-3 h-3 rounded-full bg-[#ffaa00]/60" />
        <div className="w-3 h-3 rounded-full bg-success/60" />
      </div>
      {/* Code */}
      <div className="space-y-0.5">
        {codeLines.slice(0, visibleLines).map((line, i) => (
          <div key={i} className="flex">
            <span className="text-text-tertiary w-8 text-right mr-4 select-none text-xs">{i + 1}</span>
            <span
              className={
                line.startsWith('//')
                  ? 'text-text-tertiary'
                  : line.includes('✓')
                    ? 'text-success'
                    : line.includes('"')
                      ? 'text-accent-bright'
                      : 'text-text-secondary'
              }
            >
              {line}
            </span>
          </div>
        ))}
        {visibleLines < codeLines.length && (
          <div className="flex">
            <span className="text-text-tertiary w-8 text-right mr-4 select-none text-xs">{visibleLines + 1}</span>
            <span className="typing-cursor text-text-secondary" />
          </div>
        )}
      </div>
    </div>
  )
}

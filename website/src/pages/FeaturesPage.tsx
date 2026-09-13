import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Features from '../sections/Features'

/* ── Terminal Demo Component ── */
function TerminalDemo({ command, output, delay = 0 }: { command: string; output: string[]; delay?: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  if (!visible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        background: 'rgba(5, 5, 10, 0.9)',
        border: '1px solid rgba(30, 30, 46, 0.6)',
        borderRadius: 12,
        overflow: 'hidden',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '0.85rem',
      }}
    >
      {/* Title bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'rgba(17, 17, 24, 0.8)', borderBottom: '1px solid rgba(30, 30, 46, 0.6)' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
        <span style={{ marginLeft: 8, fontSize: '0.7rem', color: '#55556a' }}>JARVIS Terminal</span>
      </div>
      {/* Content */}
      <div style={{ padding: '16px 20px', lineHeight: 1.8 }}>
        <div>
          <span style={{ color: '#00e87b' }}>❯</span>{' '}
          <span style={{ color: '#f0f0f5' }}>{command}</span>
        </div>
        {output.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 + i * 0.15 }}
            style={{ color: line.startsWith('✓') ? '#00e87b' : line.startsWith('⚡') ? '#00a8ff' : line.startsWith('⚠') ? '#ffbd2e' : '#8888a0' }}
          >
            {line}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

/* ── Stat Pill ── */
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '1rem 1.5rem', background: 'rgba(0, 168, 255, 0.04)',
      border: '1px solid rgba(0, 168, 255, 0.12)', borderRadius: 12,
    }}>
      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00a8ff' }}>{value}</span>
      <span style={{ fontSize: '0.75rem', color: '#8888a0', marginTop: 2 }}>{label}</span>
    </div>
  )
}

/* ── AGI Feature Showcase Entries ── */
const agiShowcases = [
  {
    title: 'Autonomous Project Scaffolding',
    subtitle: 'Describe what you want. JARVIS builds it.',
    icon: '🏗️',
    command: 'jarvis "Build me a full-stack SaaS dashboard with auth, billing, and analytics"',
    output: [
      '⚡ Planning project architecture...',
      '✓ Created Next.js 15 app with TypeScript',
      '✓ Supabase auth + RLS policies configured',
      '✓ LemonSqueezy billing integrated',
      '✓ Dashboard with 6 analytics widgets',
      '✓ 23 files created, 0 errors',
      '⚡ Ready at http://localhost:3000',
    ],
    highlights: ['Analyzes requirements → plans architecture → writes every file', 'Sets up database schemas, API routes, and UI components', 'Configures auth, payments, and deployment in one shot'],
  },
  {
    title: 'Deep Codebase Research',
    subtitle: 'Point JARVIS at any repo. Get instant answers.',
    icon: '🔬',
    command: 'jarvis "Explain how authentication works in this codebase and find any security vulnerabilities"',
    output: [
      '⚡ Scanning 847 files across 12 directories...',
      '✓ Found auth flow: Supabase → middleware → RLS',
      '⚠ VULNERABILITY: API route /api/admin missing auth check (line 42)',
      '⚠ VULNERABILITY: JWT not validated in WebSocket handler',
      '✓ Generated fix patches for both issues',
      '✓ Security report saved to /reports/auth-audit.md',
    ],
    highlights: ['Reads every file in your codebase (not just open files)', 'Cross-references imports, middleware chains, and data flow', 'Finds real vulnerabilities — not just lint warnings'],
  },
  {
    title: 'Multi-Step Autonomous Execution',
    subtitle: 'Give JARVIS a goal. Come back to a finished result.',
    icon: '🤖',
    command: 'jarvis "Add dark mode to the entire app, update all components, and write tests"',
    output: [
      '⚡ Step 1/5: Analyzing current theme system...',
      '✓ Step 2/5: Created ThemeProvider with system detection',
      '✓ Step 3/5: Updated 34 components with theme tokens',
      '✓ Step 4/5: Added theme toggle to Header + Settings',
      '✓ Step 5/5: Wrote 12 unit tests (all passing)',
      '⚡ Dark mode complete. 47 files modified.',
    ],
    highlights: ['Plans multi-step execution before writing any code', 'Modifies dozens of files atomically — no half-finished state', 'Writes tests for its own changes automatically'],
  },
  {
    title: 'One-Command Deployment',
    subtitle: 'From localhost to production. Zero config.',
    icon: '🚀',
    command: 'jarvis "Deploy this to production with CI/CD"',
    output: [
      '⚡ Detecting stack: Next.js 15 + Supabase + Vercel',
      '✓ Generated .github/workflows/deploy.yml',
      '✓ Created Dockerfile (multi-stage, 89MB image)',
      '✓ Set up Vercel project with environment variables',
      '✓ First deployment: https://myapp.vercel.app',
      '⚡ CI/CD pipeline active. Push to deploy.',
    ],
    highlights: ['Auto-detects your entire tech stack', 'Generates optimized Docker, GitHub Actions, or Vercel configs', 'Handles environment variables and secrets automatically'],
  },
  {
    title: 'Persistent Memory Across Sessions',
    subtitle: 'JARVIS remembers everything — forever.',
    icon: '🧠',
    command: 'jarvis "Use the same code style as last week\'s project"',
    output: [
      '⚡ Querying episodic memory...',
      '✓ Found: "ecommerce-dashboard" session (April 3)',
      '✓ Code style: functional React, Tailwind, camelCase',
      '✓ Architecture: feature-based folders, barrel exports',
      '✓ Preferences loaded. Generating code...',
    ],
    highlights: ['4-layer memory: Working → Semantic → Episodic → Vector', 'Remembers your coding style, project patterns, and preferences', 'Learns from every session — gets better the more you use it'],
  },
  {
    title: 'Screen Use & Browser Control',
    subtitle: 'JARVIS can see and interact with your screen.',
    icon: '👁️',
    command: 'jarvis "Go to Stripe dashboard and export last month\'s revenue report"',
    output: [
      '⚡ Opening browser...',
      '✓ Navigated to dashboard.stripe.com',
      '✓ Clicked "Payments" → "Export"',
      '✓ Selected date range: March 1-31, 2026',
      '✓ Downloaded revenue_march_2026.csv',
      '✓ Parsed: $47,230 total revenue, 892 transactions',
    ],
    highlights: ['Full browser automation via Playwright integration', 'Can navigate, click, fill forms, and extract data', 'Works with any web application — no API needed'],
  },
]

export default function FeaturesPage() {
  useEffect(() => { document.title = 'JARVIS — Features' }, [])

  return (
    <>
      {/* ════════ HERO ════════ */}
      <section style={{
        padding: '11rem 1.5rem 5rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated gradient background */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 168, 255, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '20%', left: '10%', width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(0, 232, 123, 0.06), transparent 70%)',
          borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 1rem', borderRadius: 999,
            background: 'rgba(0, 168, 255, 0.08)', border: '1px solid rgba(0, 168, 255, 0.2)',
            fontSize: '0.8rem', color: '#00a8ff', fontWeight: 600,
            marginBottom: '1.5rem',
          }}>
            <span>✦</span> AGI-Level Capabilities
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
            fontWeight: 900, color: '#f0f0f5',
            lineHeight: 1.05, marginBottom: '1.5rem',
            maxWidth: 800, margin: '0 auto 1.5rem',
          }}>
            Not A Copilot.<br />
            <span style={{
              background: 'linear-gradient(135deg, #00a8ff, #00e87b)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              A Full Agent.
            </span>
          </h1>

          <p style={{
            color: '#8888a0', fontSize: '1.25rem', maxWidth: 620,
            margin: '0 auto 3rem', lineHeight: 1.7,
          }}>
            JARVIS doesn't suggest code — it writes, tests, deploys, and maintains
            entire projects autonomously. See what AGI-level development looks like.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <StatPill value="25+" label="Built-in Tools" />
            <StatPill value="4" label="Memory Layers" />
            <StatPill value="∞" label="Tasks / Day" />
            <StatPill value="0" label="Cost" />
          </div>
        </motion.div>
      </section>

      {/* ════════ AGI SHOWCASES ════════ */}
      <section style={{ padding: '4rem 1.5rem 6rem' }}>
        <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: '5rem' }}
          >
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)', fontWeight: 800, color: '#f0f0f5', marginBottom: '1rem' }}>
              Real Examples. Real Output.
            </h2>
            <p style={{ color: '#8888a0', fontSize: '1.1rem', maxWidth: 550, margin: '0 auto', lineHeight: 1.7 }}>
              These aren't hypothetical. This is exactly what JARVIS does when you type a command.
            </p>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6rem' }}>
            {agiShowcases.map((showcase, i) => (
              <motion.div
                key={showcase.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.8 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: i % 2 === 0 ? '1fr 1.1fr' : '1.1fr 1fr',
                  gap: '3rem',
                  alignItems: 'center',
                }}
              >
                {/* Text side */}
                <div style={{ order: i % 2 === 0 ? 0 : 1 }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{showcase.icon}</div>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f0f0f5', marginBottom: '0.5rem' }}>
                    {showcase.title}
                  </h3>
                  <p style={{ color: '#00a8ff', fontSize: '0.95rem', fontWeight: 500, marginBottom: '1.5rem' }}>
                    {showcase.subtitle}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {showcase.highlights.map((h) => (
                      <li key={h} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.95rem' }}>
                        <span style={{
                          color: '#00e87b', fontSize: '0.7rem', marginTop: '0.35rem',
                          flexShrink: 0, width: 16, height: 16, borderRadius: '50%',
                          background: 'rgba(0, 232, 123, 0.1)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}>✓</span>
                        <span style={{ color: '#cbd5e1', lineHeight: 1.5 }}>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Terminal side */}
                <div style={{ order: i % 2 === 0 ? 1 : 0 }}>
                  <TerminalDemo command={showcase.command} output={showcase.output} delay={200} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FEATURE GRID (from home page) ════════ */}
      <section style={{
        borderTop: '1px solid rgba(30, 30, 46, 0.4)',
        borderBottom: '1px solid rgba(30, 30, 46, 0.4)',
        background: 'rgba(5, 5, 8, 0.5)',
      }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '6rem 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f0f0f5', marginBottom: '1rem' }}>
              Every Tool. <span style={{ color: '#00a8ff' }}>Built In.</span>
            </h2>
            <p style={{ color: '#8888a0', fontSize: '1.1rem', maxWidth: 500, margin: '0 auto' }}>
              25+ tools ready to use on day one. No plugins. No configuration.
            </p>
          </div>
          <Features />
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section style={{ padding: '8rem 1.5rem', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{ maxWidth: 700, margin: '0 auto' }}
        >
          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 900, color: '#f0f0f5', marginBottom: '1.5rem', lineHeight: 1.1,
          }}>
            Stop Coding.<br />
            <span style={{ color: '#00a8ff' }}>Start Commanding.</span>
          </h2>
          <p style={{ color: '#8888a0', fontSize: '1.15rem', marginBottom: '2.5rem', lineHeight: 1.7 }}>
            Install JARVIS in 30 seconds. Free and open source.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://app.letjarvis.com/signup" style={{
              background: 'linear-gradient(135deg, #00a8ff, #00e87b)',
              color: '#022c22', fontWeight: 700, fontSize: '1.1rem',
              padding: '1rem 2.5rem', borderRadius: 12,
              textDecoration: 'none', transition: 'transform 0.2s, box-shadow 0.2s',
            }}>
              Get Started Free →
            </a>
            <a href="https://github.com/personaljarvis/jarvis" target="_blank" rel="noopener noreferrer" style={{
              background: 'rgba(17, 17, 24, 0.8)', color: '#f0f0f5',
              fontWeight: 600, fontSize: '1.1rem', padding: '1rem 2.5rem',
              borderRadius: 12, textDecoration: 'none',
              border: '1px solid rgba(30, 30, 46, 0.8)',
            }}>
              ⭐ Star on GitHub
            </a>
          </div>
        </motion.div>
      </section>
    </>
  )
}

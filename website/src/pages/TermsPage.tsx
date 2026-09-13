import { motion } from 'framer-motion'
import { useEffect } from 'react'

const termsSections = [
  {
    title: '1. Acceptance of Terms',
    content: 'By accessing or using PersonalJARVIS ("the Service"), operated by the team at letjarvis.com, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.',
  },
  {
    title: '2. Description of Service',
    content: 'PersonalJARVIS is an AI-powered developer assistant that runs locally on your machine with optional cloud-synced features. The Service includes:',
    items: ['CLI agent with local and cloud AI model support', 'Web dashboard for analytics, settings, and licence management', 'Memory system for persistent project context', 'Tool integrations and skill marketplace'],
  },
  {
    title: '3. Account Requirements',
    content: 'You must provide accurate information when creating an account. You are responsible for maintaining the security of your credentials and API keys. You must be at least 16 years old to use the Service.',
  },
  {
    title: '4. Plans',
    content: 'JARVIS is free and open source. Both plans are available at no cost.',
    items: ['Balanced (Free) — Local AI, working + semantic memory, core skills, basic security', 'Productivity (Free) — Everything in Balanced + cloud AI, full 4-layer memory, advanced security, all marketplace skills'],
  },
  {
    title: '5. Acceptable Use',
    content: 'You may not use PersonalJARVIS to:',
    items: ['Generate malicious code, malware, or exploit tools', 'Violate any applicable laws or regulations', 'Infringe on the intellectual property rights of others', 'Abuse, harass, or harm other users or services', 'Circumvent license restrictions or rate limits'],
  },
  {
    title: '6. Intellectual Property',
    content: 'Code and content you create with PersonalJARVIS belongs to you. The Service itself, including its branding, design, and codebase, is the intellectual property of the PersonalJARVIS team and is protected by applicable laws.',
  },
  {
    title: '7. Limitation of Liability',
    content: 'PersonalJARVIS is provided "as is" without warranties. We are not liable for any damages arising from the use of AI-generated code, data loss, or service interruptions. You are responsible for reviewing and testing all generated output before use in production.',
    highlight: true,
  },
  {
    title: '8. Termination',
    content: 'We reserve the right to suspend or terminate your account for violations of these terms. Upon termination, your locally stored data remains on your machine. Cloud data (account, telemetry) will be deleted within 30 days.',
  },
  {
    title: '9. Open Source License',
    content: 'The PersonalJARVIS CLI is MIT licensed. You are free to fork, modify, and distribute it under the terms of the MIT license. The dashboard and cloud services are proprietary.',
  },
  {
    title: '10. Contact',
    content: 'For questions about these terms, contact us at legal@letjarvis.com.',
    email: 'legal@letjarvis.com',
  },
]

export default function TermsPage() {
  useEffect(() => { document.title = 'JARVIS — Terms of Service' }, [])

  return (
    <>
      {/* ════════ HERO ════════ */}
      <section style={{
        padding: '11rem 1.5rem 4rem', textAlign: 'center', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center top, rgba(168, 85, 247, 0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 1rem', borderRadius: 999,
            background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)',
            fontSize: '0.8rem', color: '#a855f7', fontWeight: 600, marginBottom: '1.5rem',
          }}>
            📜 Clear & Simple
          </div>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 900, color: '#f0f0f5', marginBottom: '1rem',
          }}>
            Terms of Service
          </h1>
          <p style={{ color: '#55556a', fontSize: '0.95rem' }}>Last updated: April 10, 2026</p>
        </motion.div>
      </section>

      {/* ════════ CONTENT ════════ */}
      <section style={{ padding: '2rem 1.5rem 8rem' }}>
        <div style={{ maxWidth: 800, width: '100%', margin: '0 auto' }}>
          {termsSections.map((section, si) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.5, delay: si * 0.05 }}
              style={{
                padding: '2rem',
                background: section.highlight
                  ? 'rgba(255, 189, 46, 0.03)'
                  : si % 2 === 0 ? 'rgba(10, 10, 16, 0.4)' : 'transparent',
                border: section.highlight ? '1px solid rgba(255, 189, 46, 0.1)' : 'none',
                borderRadius: 16,
                marginBottom: '1rem',
              }}
            >
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f5', marginBottom: '1rem' }}>{section.title}</h2>
              <p style={{ color: '#8888a0', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: section.items ? '0.75rem' : 0 }}>
                {section.email ? (
                  <>For questions about these terms, contact us at <a href={`mailto:${section.email}`} style={{ color: '#a855f7' }}>{section.email}</a>.</>
                ) : section.content}
              </p>
              {section.items && (
                <ul style={{ paddingLeft: '1.25rem', color: '#8888a0', fontSize: '0.95rem', lineHeight: 2 }}>
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </>
  )
}

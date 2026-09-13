import { motion } from 'framer-motion'
import { useEffect } from 'react'

const sections = [
  {
    title: '1. Overview',
    content: 'PersonalJARVIS ("we", "us", "our") respects your privacy. This policy explains what data we collect, why, how we use it, and your rights. We are committed to transparency and data minimalism.',
  },
  {
    title: '2. Data We Collect',
    subsections: [
      {
        subtitle: 'Account Data',
        items: ['Email address and full name (at signup)', 'Authentication credentials (hashed, managed by Supabase)', 'Subscription and billing status'],
      },
      {
        subtitle: 'Usage Telemetry (Opt-in)',
        items: ['Session counts and durations', 'Tool execution counts (not input/output content)', 'Model provider usage statistics', 'Memory item counts (not the content of memories)'],
        note: 'We never collect the actual content of your code, conversations, files, or terminal commands. Telemetry consists only of aggregate counts and metadata.',
      },
      {
        subtitle: 'Data Stored Locally Only',
        intro: 'The following data stays on your machine and is never transmitted to our servers:',
        items: ['Your code, files, and project content', 'Conversation history with JARVIS', 'Memory system contents (preferences, facts, projects)', 'Terminal command history and output', 'API keys for third-party AI providers'],
      },
    ],
  },
  {
    title: '3. How We Use Your Data',
    items: ['To provide and maintain the Service', 'To manage your subscription and authentication', 'To display usage analytics in your dashboard', 'To improve the Service based on aggregate usage patterns', 'To communicate important service updates'],
    note: 'We never sell your data. We never share your individual data with third parties for marketing.',
  },
  {
    title: '4. Third-Party Services',
    content: 'We use the following third-party services:',
    items: ['Supabase — Database, authentication, and data storage (PostgreSQL with RLS)', 'LemonSqueezy — Payment processing and subscription management', 'Vercel — Dashboard hosting and CDN'],
    note: 'When using cloud AI features, your prompts are sent to your configured AI providers (OpenAI, Google, Anthropic). Each provider has its own privacy policy. JARVIS does not store or cache these interactions on our servers.',
  },
  {
    title: '5. Data Security',
    content: 'All data in transit is encrypted via TLS. Data at rest is encrypted by Supabase. Database access is controlled by Row-Level Security policies — each user can only access their own data.',
  },
  {
    title: '6. Data Retention',
    content: 'Account data is retained for the duration of your account. Telemetry data is retained for 12 months. Upon account deletion, all associated data is permanently removed within 30 days.',
  },
  {
    title: '7. Your Rights',
    items: ['Access — View all your data from the dashboard', 'Correction — Update your profile in dashboard settings', 'Deletion — Delete your account from dashboard settings', 'Export — Request a data export by contacting support', 'Opt-out — Disable telemetry in JARVIS CLI settings'],
  },
  {
    title: '8. Cookies',
    content: 'We use essential cookies only for authentication session management. We do not use tracking cookies or third-party analytics cookies.',
  },
  {
    title: '9. Changes to This Policy',
    content: 'We will notify you of material changes via email or dashboard notification. Continued use after changes constitutes acceptance.',
  },
  {
    title: '10. Contact',
    content: 'For privacy questions or data requests, contact us at privacy@letjarvis.com.',
    email: 'privacy@letjarvis.com',
  },
]

export default function PrivacyPage() {
  useEffect(() => { document.title = 'JARVIS — Privacy Policy' }, [])

  return (
    <>
      {/* ════════ HERO ════════ */}
      <section style={{
        padding: '11rem 1.5rem 4rem', textAlign: 'center', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center top, rgba(0, 168, 255, 0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 1rem', borderRadius: 999,
            background: 'rgba(0, 168, 255, 0.08)', border: '1px solid rgba(0, 168, 255, 0.2)',
            fontSize: '0.8rem', color: '#00a8ff', fontWeight: 600, marginBottom: '1.5rem',
          }}>
            🔒 Your Data, Your Control
          </div>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 900, color: '#f0f0f5', marginBottom: '1rem',
          }}>
            Privacy Policy
          </h1>
          <p style={{ color: '#55556a', fontSize: '0.95rem' }}>Last updated: April 10, 2026</p>
        </motion.div>
      </section>

      {/* ════════ CONTENT ════════ */}
      <section style={{ padding: '2rem 1.5rem 8rem' }}>
        <div style={{ maxWidth: 800, width: '100%', margin: '0 auto' }}>
          {sections.map((section, si) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.5, delay: si * 0.05 }}
              style={{
                padding: '2rem',
                background: si % 2 === 0 ? 'rgba(10, 10, 16, 0.4)' : 'transparent',
                borderRadius: 16,
                marginBottom: '1rem',
              }}
            >
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f5', marginBottom: '1rem' }}>{section.title}</h2>

              {section.content && (
                <p style={{ color: '#8888a0', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: section.items ? '0.75rem' : 0 }}>
                  {section.email ? (
                    <>For privacy questions or data requests, contact us at <a href={`mailto:${section.email}`} style={{ color: '#00a8ff' }}>{section.email}</a>.</>
                  ) : section.content}
                </p>
              )}

              {section.items && (
                <ul style={{ paddingLeft: '1.25rem', color: '#8888a0', fontSize: '0.95rem', lineHeight: 2 }}>
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}

              {section.note && (
                <p style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(0, 168, 255, 0.05)', border: '1px solid rgba(0, 168, 255, 0.1)', borderRadius: 8, color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  <strong style={{ color: '#00a8ff' }}>Note:</strong> {section.note}
                </p>
              )}

              {'subsections' in section && section.subsections?.map((sub) => (
                <div key={sub.subtitle} style={{ marginTop: '1.25rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f0f0f5', marginBottom: '0.5rem' }}>{sub.subtitle}</h3>
                  {'intro' in sub && sub.intro && <p style={{ color: '#8888a0', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{sub.intro}</p>}
                  <ul style={{ paddingLeft: '1.25rem', color: '#8888a0', fontSize: '0.9rem', lineHeight: 2 }}>
                    {sub.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  {'note' in sub && sub.note && (
                    <p style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(0, 168, 255, 0.05)', border: '1px solid rgba(0, 168, 255, 0.1)', borderRadius: 8, color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.6 }}>
                      <strong style={{ color: '#00a8ff' }}>Important:</strong> {sub.note}
                    </p>
                  )}
                </div>
              ))}
            </motion.div>
          ))}
        </div>
      </section>
    </>
  )
}

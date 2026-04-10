import { motion, useInView } from 'framer-motion'
import { useRef, forwardRef } from 'react'

const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Compare', href: '/compare' },
      { label: 'Dashboard', href: 'https://app.letjarvis.com' },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    title: 'Documentation',
    links: [
      { label: 'Getting Started', href: 'https://docs.letjarvis.com' },
      { label: 'API Reference', href: 'https://docs.letjarvis.com' },
      { label: 'CLI Guide', href: 'https://docs.letjarvis.com' },
      { label: 'GitHub', href: 'https://github.com/personaljarvis/jarvis' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Twitter / X', href: '#' },
      { label: 'Discord', href: '#' },
      { label: 'Blog', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'License (MIT)', href: '#' },
    ],
  },
]

const Footer = forwardRef<HTMLElement>(function Footer(_, ref) {
  const viewRef = useRef(null)
  const isInView = useInView(viewRef, { once: true, margin: '-50px' })

  return (
    <footer ref={ref} style={{ borderTop: '1px solid rgba(30, 30, 46, 0.6)', background: 'rgba(10, 10, 16, 0.8)' }}>
      {/* CTA Section */}
      <div ref={viewRef} style={{ padding: '6rem 1.5rem 5rem' }}>
        <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto' }}>
          {/* CTA Headline — centered */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            style={{ textAlign: 'center', marginBottom: '3rem' }}
          >
            <h2 style={{
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: '1.5rem',
              color: '#f0f0f5',
            }}>
              READY TO LET<br />
              <span style={{ color: '#00a8ff' }}>JARVIS</span> DO IT?
            </h2>
            <p style={{ color: '#8888a0', fontSize: '1.15rem', maxWidth: 500, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
              Join the next generation of developers who ship faster with autonomous AI.
              Free and open source. No credit card required.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
              <a
                href="https://app.letjarvis.com/signup"
                className="cta-glow"
                style={{
                  background: '#00a8ff',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  padding: '1rem 2.5rem',
                  borderRadius: 12,
                  textDecoration: 'none',
                  position: 'relative',
                  zIndex: 10,
                  transition: 'all 0.3s',
                }}
              >
                Get Started Free →
              </a>
              <a
                href="https://github.com/personaljarvis/jarvis"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'rgba(17, 17, 24, 0.8)',
                  color: '#8888a0',
                  fontWeight: 500,
                  fontSize: '1.1rem',
                  padding: '1rem 2.5rem',
                  borderRadius: 12,
                  textDecoration: 'none',
                  border: '1px solid rgba(30, 30, 46, 0.8)',
                  transition: 'all 0.3s',
                }}
              >
                ⭐ Star on GitHub
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Divider */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(30, 30, 46, 0.8) 20%, rgba(0, 168, 255, 0.15) 50%, rgba(30, 30, 46, 0.8) 80%, transparent 100%)',
        maxWidth: '60%',
        margin: '0 auto',
      }} />

      {/* Link Columns */}
      <div style={{ padding: '4rem 1.5rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            maxWidth: 1200,
            width: '100%',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '3rem',
          }}
        >
          {footerLinks.map((col) => (
            <div key={col.title}>
              <h4 style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#f0f0f5',
                marginBottom: '1.25rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                {col.title}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {col.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    style={{
                      fontSize: '0.875rem',
                      color: '#55556a',
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#f0f0f5' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#55556a' }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(30, 30, 46, 0.4)', padding: '1.5rem' }}>
        <div style={{
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'linear-gradient(135deg, #00a8ff, #40c8ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span style={{ fontSize: '0.875rem', color: '#55556a' }}>
              © {new Date().getFullYear()} JARVIS · letjarvis.com
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#55556a' }}>
            Built autonomously. Shipped by humans.
          </span>
        </div>
      </div>
    </footer>
  )
})

export default Footer

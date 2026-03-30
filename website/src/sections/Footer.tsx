import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#compare' },
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
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'License (MIT)', href: '#' },
    ],
  },
]

export default function Footer() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <footer ref={ref} className="border-t border-border bg-surface-2">
      {/* Giant CTA Section */}
      <div className="py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start justify-between gap-16">
          {/* Left — CTA */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="flex-1 max-w-xl"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6">
              READY TO LET
              <br />
              <span className="text-accent">JARVIS</span> DO IT?
            </h2>
            <p className="text-text-secondary text-lg mb-8 max-w-md">
              Join the next generation of developers who ship faster with autonomous AI.
              Free during launch. No credit card required.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://app.letjarvis.com/signup"
                className="cta-glow bg-accent hover:bg-accent-bright text-white font-semibold text-lg px-8 py-4 rounded-xl transition-all relative z-10"
              >
                Get Started Free →
              </a>
              <a
                href="https://github.com/personaljarvis/jarvis"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-3 hover:bg-surface-4 text-text-secondary hover:text-text-primary border border-border font-medium text-lg px-8 py-4 rounded-xl transition-all"
              >
                ⭐ Star on GitHub
              </a>
            </div>
          </motion.div>

          {/* Right — Link Columns */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12"
          >
            {footerLinks.map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-text-primary mb-4 tracking-wide uppercase">
                  {col.title}
                </h4>
                <div className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="text-sm text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent to-accent-bright flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-sm text-text-tertiary">
              © {new Date().getFullYear()} JARVIS · letjarvis.com
            </span>
          </div>
          <span className="text-xs text-text-tertiary">
            Built autonomously. Shipped by humans.
          </span>
        </div>
      </div>
    </footer>
  )
}

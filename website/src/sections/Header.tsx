import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'

const navLinks = [
  { label: 'Features', href: '/features' },
  { label: 'Compare', href: '/compare' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Docs', href: 'https://docs.letjarvis.com', external: true },
]

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 bg-[#050505] border-b border-white/[0.05] overflow-visible"
    >
      <div className="max-w-7xl mx-auto px-8 lg:px-12 h-16 relative flex items-center">
        
        {/* Left: Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 flex-1 pl-2">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.href}
                className={`text-sm transition-colors ${
                  location.pathname === link.href
                    ? 'text-accent font-medium'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        {/* Center: Logo */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex justify-center">
          <Link to="/" className="flex items-center gap-3 group">
            {/* The textured blue circle logo */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#3f7de8] transition-transform duration-300 group-hover:scale-105" style={{ boxShadow: '0 0 15px rgba(63,125,232,0.3)' }}>
              <div className="absolute inset-0 opacity-[0.35] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")' }}></div>
            </div>
            <span className="text-xl font-bold tracking-widest text-white group-hover:text-[#3f7de8] transition-colors" style={{ textShadow: '0 0 15px rgba(63,125,232,0.3)' }}>
              JARVIS
            </span>
          </Link>
        </div>

        {/* Right: Desktop CTA */}
        <div className="hidden md:flex items-center justify-end gap-6 flex-1 pr-2">
          <a
            href="https://app.letjarvis.com/login"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Log In
          </a>
          <a
            href="https://app.letjarvis.com/signup"
            className="group relative overflow-hidden text-sm font-bold text-white px-8 py-2.5 rounded flex items-center justify-center transition-all duration-300 bg-accent hover:bg-accent-bright border border-accent-bright/50 shadow-[0_0_20px_rgba(0,168,255,0.35)] hover:shadow-[0_0_35px_rgba(0,168,255,0.6)] transform hover:-translate-y-0.5"
          >
            <span className="relative z-10 tracking-wider">Get Started Free</span>
            {/* Glass Reflection Sweep Effect */}
            <div className="absolute inset-0 w-full h-full flex justify-center overflow-hidden">
              <div className="h-full w-12 absolute top-0 -left-12 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-all duration-700 ease-out group-hover:left-[120%]" />
            </div>
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span className={`w-5 h-0.5 bg-text-primary transition-transform ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`w-5 h-0.5 bg-text-primary transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`w-5 h-0.5 bg-text-primary transition-transform ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden border-t border-border overflow-hidden bg-surface"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {navLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="text-base text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-base text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                )
              )}
              <hr className="border-border" />
              <a href="https://app.letjarvis.com/login" className="text-base text-text-secondary">Log In</a>
              <a href="https://app.letjarvis.com/signup" className="text-base font-semibold bg-accent text-white px-5 py-3 rounded-lg text-center">
                Get Started Free
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

import { useState, useRef, useEffect } from 'react'
import Header from './sections/Header'
import HeroHook from './sections/HeroHook'
import Logic from './sections/Logic'
import Execution from './sections/Execution'
import Result from './sections/Result'
import Comparison from './sections/Comparison'
import Features from './sections/Features'
import FAQ from './sections/FAQ'
import Footer from './sections/Footer'

export default function App() {
  const [activeSection, setActiveSection] = useState(0)
  const snapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = snapRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const sectionHeight = window.innerHeight
      const index = Math.round(scrollTop / sectionHeight)
      setActiveSection(index)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="bg-surface min-h-screen">
      <Header />

      {/* PHASE 1: Snap-scroll sections (100vh each) */}
      <div ref={snapRef} className="snap-container">
        <HeroHook isActive={activeSection === 0} />
        <Logic isActive={activeSection === 1} />
        <Execution isActive={activeSection === 2} />
        <Result isActive={activeSection === 3} />
      </div>

      {/* PHASE 2: Normal scroll sections */}
      <div className="bg-surface">
        <Comparison />
        <div className="border-t border-border/30" />
        <Features />
        <div className="border-t border-border/30" />
        <FAQ />
        <Footer />
      </div>
    </div>
  )
}

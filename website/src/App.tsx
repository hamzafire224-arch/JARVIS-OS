import { useState, useRef, useEffect, useCallback } from 'react'
import Header from './sections/Header'
import HeroHook from './sections/HeroHook'
import Logic from './sections/Logic'
import Execution from './sections/Execution'
import Result from './sections/Result'
import Comparison from './sections/Comparison'
import SocialProof from './sections/SocialProof'
import Features from './sections/Features'
import Pricing from './sections/Pricing'
import FAQ from './sections/FAQ'
import Footer from './sections/Footer'
import ScrollNav from './components/ScrollNav'

const TOTAL_SNAP_SECTIONS = 4

export default function App() {
  const [activeSection, setActiveSection] = useState(0)
  const [snapPhase, setSnapPhase] = useState(true) // true = in full-screen snap phase
  const containerRef = useRef<HTMLDivElement>(null)
  const isTransitioning = useRef(false)

  // Handle wheel events during snap phase
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!snapPhase) return // let normal scroll happen
    if (isTransitioning.current) {
      e.preventDefault()
      return
    }

    const delta = e.deltaY
    const threshold = 30

    if (Math.abs(delta) < threshold) return

    e.preventDefault()

    if (delta > 0) {
      // Scrolling down
      if (activeSection < TOTAL_SNAP_SECTIONS - 1) {
        isTransitioning.current = true
        setActiveSection((prev) => prev + 1)
        setTimeout(() => { isTransitioning.current = false }, 800)
      } else {
        // Last snap section — transition to normal scroll
        setSnapPhase(false)
      }
    } else {
      // Scrolling up
      if (activeSection > 0) {
        isTransitioning.current = true
        setActiveSection((prev) => prev - 1)
        setTimeout(() => { isTransitioning.current = false }, 800)
      }
    }
  }, [snapPhase, activeSection])

  // Handle scroll on normal phase — re-enter snap if scrolling back to top
  const handleNormalScroll = useCallback(() => {
    if (snapPhase) return
    const el = containerRef.current
    if (!el) return

    if (el.scrollTop <= 0) {
      setSnapPhase(true)
      setActiveSection(TOTAL_SNAP_SECTIONS - 1)
    }
  }, [snapPhase])

  // Touch event support for mobile
  const touchStartY = useRef(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!snapPhase) return
    if (isTransitioning.current) return

    const delta = touchStartY.current - e.changedTouches[0].clientY
    const threshold = 50

    if (Math.abs(delta) < threshold) return

    if (delta > 0) {
      // Swiped up (scrolling down)
      if (activeSection < TOTAL_SNAP_SECTIONS - 1) {
        isTransitioning.current = true
        setActiveSection((prev) => prev + 1)
        setTimeout(() => { isTransitioning.current = false }, 800)
      } else {
        setSnapPhase(false)
      }
    } else {
      // Swiped down (scrolling up)
      if (activeSection > 0) {
        isTransitioning.current = true
        setActiveSection((prev) => prev - 1)
        setTimeout(() => { isTransitioning.current = false }, 800)
      }
    }
  }, [snapPhase, activeSection])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('scroll', handleNormalScroll, { passive: true })
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('scroll', handleNormalScroll)
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleWheel, handleNormalScroll, handleTouchStart, handleTouchEnd])

  // When exiting snap phase, scroll the normal container to the top of Phase 2
  useEffect(() => {
    if (!snapPhase && containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }, [snapPhase])

  return (
    <div
      ref={containerRef}
      className={snapPhase ? 'app-root snap-active' : 'app-root scroll-active'}
    >
      <Header />
      <ScrollNav snapPhase={snapPhase} setSnapPhase={setSnapPhase} activeSection={activeSection} setActiveSection={setActiveSection} />

      {/* PHASE 1: Full-screen snap sections */}
      {snapPhase && (
        <div className="snap-viewport">
          <div
            className="snap-track"
            style={{ transform: `translateY(-${activeSection * 100}vh)` }}
          >
            <HeroHook isActive={activeSection === 0} />
            <Logic isActive={activeSection === 1} />
            <Execution isActive={activeSection === 2} />
            <Result isActive={activeSection === 3} />
          </div>
        </div>
      )}

      {/* PHASE 2: Normal scrollable sections — generous spacing */}
      {!snapPhase && (
        <div className="normal-sections">
          <Comparison />
          <div className="section-divider" />
          <SocialProof />
          <div className="section-divider" />
          <Features />
          <div className="section-divider" />
          <Pricing />
          <div className="section-divider" />
          <FAQ />
          <Footer />
        </div>
      )}
    </div>
  )
}

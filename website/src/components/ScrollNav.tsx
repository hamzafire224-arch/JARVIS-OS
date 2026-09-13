import { useEffect, useState, useCallback, RefObject } from 'react'
import './ScrollNav.css'

interface ScrollNavProps {
  snapPhase: boolean
  activeSection: number
  totalSnapSections: number
  setActiveSection: (val: number | ((prev: number) => number)) => void
  setSnapPhase: (val: boolean) => void
  containerRef: RefObject<HTMLDivElement | null>
  footerRef: RefObject<HTMLElement | null>
}

export default function ScrollNav({
  snapPhase,
  activeSection,
  totalSnapSections,
  setActiveSection,
  setSnapPhase,
  containerRef,
  footerRef,
}: ScrollNavProps) {
  const [footerVisible, setFooterVisible] = useState(false)

  // Detect if footer is visible via IntersectionObserver
  useEffect(() => {
    if (!footerRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0.15 }
    )
    observer.observe(footerRef.current)
    return () => observer.disconnect()
  }, [footerRef])

  // In normal scroll: arrow is UP when at footer, DOWN otherwise
  // In snap phase: always DOWN
  const isUp = !snapPhase && footerVisible

  const handleClick = useCallback(() => {
    if (snapPhase) {
      // During snap phase: advance to next section
      if (activeSection < totalSnapSections - 1) {
        setActiveSection((prev) => prev + 1)
      } else {
        // Exit snap phase → enter normal scroll
        setSnapPhase(false)
      }
    } else if (footerVisible) {
      // At the bottom → scroll back up, then re-enter snap
      const el = containerRef.current
      if (el) {
        el.scrollTo({ top: 0, behavior: 'smooth' })
        // Wait for scroll to finish, then re-enter snap
        const checkScroll = () => {
          if (el.scrollTop <= 5) {
            setSnapPhase(true)
            setActiveSection(totalSnapSections - 1)
          } else {
            requestAnimationFrame(checkScroll)
          }
        }
        requestAnimationFrame(checkScroll)
      }
    } else {
      // Normal scroll phase, not at footer → scroll down one viewport
      const el = containerRef.current
      if (el) {
        el.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' })
      }
    }
  }, [snapPhase, activeSection, totalSnapSections, footerVisible, setActiveSection, setSnapPhase, containerRef])

  return (
    <div className="scroll-nav-container">
      {/* Dot indicators — only during snap phase */}
      {snapPhase && (
        <div className="scroll-nav-dots">
          {Array.from({ length: totalSnapSections }).map((_, i) => (
            <button
              key={i}
              className={`scroll-nav-dot ${i === activeSection ? 'active' : ''}`}
              onClick={() => setActiveSection(i)}
              aria-label={`Go to section ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Main button */}
      <button
        onClick={handleClick}
        className="scroll-nav-btn"
        aria-label={isUp ? 'Scroll Up' : 'Scroll Down'}
      >
        <div className={`scroll-nav-water ${isUp ? 'drain' : ''}`} />
        <div className={`scroll-nav-arrow ${isUp ? 'is-up' : 'is-down'}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M19 12l-7 7-7-7" />
          </svg>
        </div>
      </button>
    </div>
  )
}

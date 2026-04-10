import React from 'react';
import './ScrollNav.css';

interface ScrollNavProps {
  snapPhase: boolean;
  activeSection: number;
  setActiveSection: (val: number | ((prev: number) => number)) => void;
  setSnapPhase: (val: boolean) => void;
}

export default function ScrollNav({ snapPhase, activeSection, setActiveSection, setSnapPhase }: ScrollNavProps) {
  const isUp = !snapPhase; // When we are in the normal website, arrow turns upwards

  const handleClick = () => {
    if (snapPhase) {
      if (activeSection < 3) {
        setActiveSection(prev => prev + 1);
      } else {
        setSnapPhase(false);
      }
    } else {
      // In normal website, scroll up smoothly to top of normal section
      // and re-engage snapPhase
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // We rely on handleNormalScroll in App.tsx to switch back to snapPhase automatically when top is reached
      // Alternatively, we force it right now if they click:
      setSnapPhase(true);
      setActiveSection(3);
    }
  };

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 z-50 mix-blend-difference">
      <button 
        onClick={handleClick}
        className="scroll-nav-btn group"
        aria-label={isUp ? "Scroll Up" : "Scroll Down"}
      >
        <div className="scroll-nav-water" />
        <div className={`scroll-nav-arrow ${isUp ? 'is-up' : 'is-down'}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M19 12l-7 7-7-7" className="arrow-head" />
          </svg>
        </div>
      </button>
    </div>
  );
}

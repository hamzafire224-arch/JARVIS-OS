import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface GlitchTextProps {
  verb: string
  isActive: boolean
}

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&'

export default function GlitchText({ verb, isActive }: GlitchTextProps) {
  const [displayText, setDisplayText] = useState(verb)
  const [isDecoding, setIsDecoding] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isActive) return

    setIsDecoding(true)
    let iteration = 0
    const target = verb.toUpperCase()

    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
      setDisplayText(
        target
          .split('')
          .map((char, i) => {
            if (i < iteration) return target[i]
            return chars[Math.floor(Math.random() * chars.length)]
          })
          .join('')
      )

      if (iteration >= target.length) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setIsDecoding(false)
      }

      iteration += 1 / 3
    }, 40)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [verb, isActive])

  return (
    <AnimatePresence mode="wait">
      <motion.h1
        key={verb}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-center leading-none"
      >
        <span className="text-text-primary">LET JARVIS </span>
        <span
          className="glitch-verb"
          data-text={displayText}
          style={{
            textShadow: isDecoding
              ? '0 0 30px var(--color-accent-glow), 0 0 60px var(--color-accent-glow)'
              : '0 0 20px var(--color-accent-glow)',
          }}
        >
          {displayText}
        </span>
        <span className="text-text-primary"> IT</span>
      </motion.h1>
    </AnimatePresence>
  )
}

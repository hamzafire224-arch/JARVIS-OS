import { useState, useEffect, useRef } from 'react'

const stats = [
  { value: 1200, label: 'Developers', suffix: '+', prefix: '' },
  { value: 50000, label: 'Tasks Completed', suffix: '+', prefix: '' },
  { value: 25, label: 'Built-in Tools', suffix: '+', prefix: '' },
  { value: 4.9, label: 'Rating', suffix: '★', prefix: '' },
]

function AnimatedNum({ value, suffix, prefix }: { value: number; suffix: string; prefix: string }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const counted = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true
          const start = performance.now()
          const duration = 1500

          const step = (now: number) => {
            const elapsed = now - start
            const p = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - p, 3)
            setDisplay(eased * value)
            if (p < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value])

  const formatted =
    value >= 1000
      ? Math.round(display).toLocaleString()
      : value % 1 !== 0
        ? display.toFixed(1)
        : Math.round(display).toString()

  return (
    <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}{formatted}{suffix}
    </span>
  )
}

export default function SocialProof() {
  return (
    <section style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
      <p style={{
        fontSize: '0.8rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        color: '#10b981',
        marginBottom: '2.5rem',
      }}>
        Trusted by developers worldwide
      </p>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '5rem',
        flexWrap: 'wrap',
        maxWidth: 1100,
        width: '100%',
        margin: '0 auto',
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 140,
          }}>
            <span style={{
              fontSize: '3rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}>
              <AnimatedNum value={s.value} suffix={s.suffix} prefix={s.prefix} />
            </span>
            <span style={{
              fontSize: '0.95rem',
              color: '#94a3b8',
              marginTop: '0.5rem',
              fontWeight: 500,
            }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

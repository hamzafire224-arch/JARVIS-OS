import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const categories = ['Autonomy', 'Memory', 'Security', 'Deployment', 'Research', 'Local AI', 'Price']

interface CompetitorData {
  name: string
  highlight?: boolean
  values: Record<string, string | boolean>
}

const competitors: CompetitorData[] = [
  {
    name: 'JARVIS',
    highlight: true,
    values: {
      Autonomy: 'Full E2E',
      Memory: '4-Layer',
      Security: 'Framework',
      Deployment: 'One-Click',
      Research: 'Autonomous',
      'Local AI': true,
      Price: 'Free & Open Source',
    },
  },
  {
    name: 'Copilot',
    values: {
      Autonomy: 'Suggestions',
      Memory: 'Session',
      Security: 'Basic',
      Deployment: 'Manual',
      Research: 'None',
      'Local AI': false,
      Price: '$19/mo',
    },
  },
  {
    name: 'SuperAGI',
    values: {
      Autonomy: 'Partial',
      Memory: 'Vector',
      Security: 'Basic',
      Deployment: 'Manual',
      Research: 'Partial',
      'Local AI': false,
      Price: 'Open Source',
    },
  },
  {
    name: 'OpenClaw',
    values: {
      Autonomy: 'Agent',
      Memory: 'Session',
      Security: 'None',
      Deployment: 'None',
      Research: 'Partial',
      'Local AI': false,
      Price: 'Open Source',
    },
  },
]

function CellValue({ value, isHighlight }: { value: string | boolean; isHighlight?: boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <span className="text-success text-lg">✓</span>
    ) : (
      <span className="text-error/60 text-lg">✗</span>
    )
  }
  return <span>{value}</span>
}

export default function Comparison() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="compare" ref={ref} style={{ padding: '8rem 1.5rem' }}>
      <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 800, marginBottom: '1rem', color: '#f0f0f5' }}>
            Why <span className="text-accent">JARVIS</span>?
          </h2>
          <p style={{ color: '#8888a0', fontSize: '1.125rem', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
            Not just another copilot. A fully autonomous agent that completes tasks end-to-end.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            background: 'rgba(10, 10, 16, 0.8)',
            border: '1px solid rgba(30, 30, 46, 0.8)',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '1rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(30, 30, 46, 0.8)', background: 'rgba(17, 17, 24, 0.5)' }}>
                  <th style={{ textAlign: 'left', padding: '1.25rem 2rem', color: '#55556a', fontWeight: 500, width: 180 }}>Feature</th>
                  {competitors.map((c) => (
                    <th
                      key={c.name}
                      style={{
                        padding: '1.25rem 2rem',
                        fontWeight: 600,
                        textAlign: 'center',
                        color: c.highlight ? '#00a8ff' : '#8888a0',
                        background: c.highlight ? 'rgba(0, 168, 255, 0.04)' : 'transparent',
                      }}
                    >
                      {c.name}
                      {c.highlight && (
                        <div style={{ fontSize: '0.625rem', fontWeight: 400, color: 'rgba(0, 168, 255, 0.6)', marginTop: 4 }}>★ Recommended</div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr
                    key={cat}
                    style={{
                      borderBottom: '1px solid rgba(30, 30, 46, 0.4)',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(17, 17, 24, 0.3)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                  >
                    <td style={{ padding: '1.15rem 2rem', color: '#8888a0', fontWeight: 500 }}>{cat}</td>
                    {competitors.map((c) => (
                      <td
                        key={c.name}
                        style={{
                          padding: '1.15rem 2rem',
                          textAlign: 'center',
                          color: c.highlight ? '#f0f0f5' : '#55556a',
                          fontWeight: c.highlight ? 500 : 400,
                          background: c.highlight ? 'rgba(0, 168, 255, 0.02)' : 'transparent',
                        }}
                      >
                        <CellValue value={c.values[cat]} isHighlight={c.highlight} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

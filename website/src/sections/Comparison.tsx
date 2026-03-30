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
      Price: 'Free*',
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
      Price: '$30/mo',
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
      Price: '$20/mo',
    },
  },
]

function CellValue({ value }: { value: string | boolean }) {
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
    <section id="compare" ref={ref} className="py-24 md:py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Why <span className="text-accent">JARVIS</span>?
          </h2>
          <p className="text-text-secondary text-lg max-w-xl mx-auto">
            Not just another copilot. A fully autonomous agent that completes tasks end-to-end.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="overflow-x-auto"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 text-text-tertiary font-medium">Feature</th>
                {competitors.map((c) => (
                  <th
                    key={c.name}
                    className={`py-4 px-4 font-semibold text-center ${
                      c.highlight ? 'text-accent' : 'text-text-secondary'
                    }`}
                  >
                    {c.name}
                    {c.highlight && (
                      <div className="text-[10px] font-normal text-accent/60 mt-0.5">★ Recommended</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat} className="border-b border-border/50 hover:bg-surface-2/50 transition-colors">
                  <td className="py-3.5 px-4 text-text-secondary font-medium">{cat}</td>
                  {competitors.map((c) => (
                    <td
                      key={c.name}
                      className={`py-3.5 px-4 text-center ${
                        c.highlight
                          ? 'text-text-primary font-medium bg-accent/[0.03]'
                          : 'text-text-tertiary'
                      }`}
                    >
                      <CellValue value={c.values[cat]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-text-tertiary text-xs mt-4">* Free during launch period. $20/mo after.</p>
        </motion.div>
      </div>
    </section>
  )
}

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
    <section id="compare" ref={ref} className="pt-32 md:pt-44 pb-32 md:pb-44 px-6">
      <div className="max-w-6xl mx-auto">
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
          className="bg-surface-2 border border-border rounded-2xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm md:text-base">
              <thead>
                <tr className="border-b border-border bg-surface-3/50">
                  <th className="text-left py-4 px-6 text-text-tertiary font-medium w-40">Feature</th>
                  {competitors.map((c) => (
                    <th
                      key={c.name}
                      className={`py-4 px-6 font-semibold text-center ${
                        c.highlight ? 'text-accent bg-accent/[0.05]' : 'text-text-secondary'
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
                  <tr key={cat} className="border-b border-border/50 hover:bg-surface-3/30 transition-colors">
                    <td className="py-4 px-6 text-text-secondary font-medium">{cat}</td>
                    {competitors.map((c) => (
                      <td
                        key={c.name}
                        className={`py-4 px-6 text-center ${
                          c.highlight
                            ? 'text-text-primary font-medium bg-accent/[0.03]'
                            : 'text-text-tertiary'
                        }`}
                      >
                        <CellValue value={c.values[cat]} isHighlight={c.highlight} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-surface-3/30 border-t border-border/30">
            <p className="text-text-tertiary text-xs">* Free during launch period. $20/mo after.</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

import { motion } from 'framer-motion'

export default function GlowOrb({ scale = 1 }: { scale?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 280 * scale, height: 280 * scale }}>
      {/* Outer rings */}
      {[1.6, 2.1, 2.7].map((s, i) => (
        <div
          key={i}
          className="orb-ring absolute"
          style={{
            width: 200 * scale * s,
            height: 200 * scale * s,
            animationDuration: `${18 + i * 8}s`,
            animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
            opacity: 0.15 - i * 0.03,
          }}
        />
      ))}
      {/* Main orb */}
      <motion.div
        className="glow-orb"
        style={{ width: 200 * scale, height: 200 * scale }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Inner light */}
      <div
        className="absolute rounded-full"
        style={{
          width: 80 * scale,
          height: 80 * scale,
          background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)',
        }}
      />
    </div>
  )
}

const plans = [
  {
    name: 'Balanced',
    price: 'Free',
    pricePer: '',
    description: 'Perfect for getting started with JARVIS.',
    badge: null,
    features: [
      { text: 'Ollama (local) — unlimited', included: true },
      { text: 'Core tools (filesystem, terminal, git)', included: true },
      { text: 'Working memory (24 items)', included: true },
      { text: 'Community support', included: true },
      { text: 'Cloud AI providers (Gemini, GPT-4, Claude)', included: false },
      { text: 'Full 4-layer memory system', included: false },
      { text: 'Multi-step autonomous execution', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Get Started Free',
    ctaHref: 'https://letjarvis.com/signup',
    highlight: false,
  },
  {
    name: 'Productivity',
    price: '$20',
    pricePer: '/ month',
    description: 'Full power. Unlimited potential. Zero friction.',
    badge: 'MOST POPULAR',
    features: [
      { text: 'All local providers — unlimited', included: true },
      { text: 'All 25+ tools & skills', included: true },
      { text: 'Full 4-layer memory system', included: true },
      { text: 'Cloud AI (Gemini, GPT-4, Claude)', included: true },
      { text: 'Multi-step autonomous execution', included: true },
      { text: 'Screen Use & browser control', included: true },
      { text: 'Workflow builder & MCP bridge', included: true },
      { text: 'Priority support & updates', included: true },
    ],
    cta: 'Start Free Trial',
    ctaHref: 'https://letjarvis.com/signup',
    highlight: true,
  },
]

export default function Pricing() {
  return (
    <section style={{ padding: '5rem 2rem' }}>
      <div style={{ width: '100%', maxWidth: '85vw', margin: '0 auto', textAlign: 'center' }}>
        <p style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: '#10b981',
          marginBottom: '0.75rem',
        }}>
          Pricing
        </p>
        <h2 style={{
          fontSize: '2.25rem',
          fontWeight: 800,
          color: '#f1f5f9',
          marginBottom: '0.75rem',
        }}>
          Choose your plan
        </h2>
        <p style={{
          color: '#94a3b8',
          fontSize: '1.05rem',
          marginBottom: '3rem',
          maxWidth: 480,
          margin: '0 auto 3rem',
          lineHeight: 1.6,
        }}>
          Start free with Balanced. Upgrade anytime for the full JARVIS experience.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '3rem',
          maxWidth: 1200,
          margin: '0 auto',
        }}>
          {plans.map((plan, i) => (
            <div
              key={i}
              style={{
                background: plan.highlight
                  ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.05), rgba(6, 182, 212, 0.05))'
                  : 'rgba(22, 24, 34, 0.6)',
                border: plan.highlight
                  ? '1.5px solid rgba(16, 185, 129, 0.35)'
                  : '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 16,
                padding: '2rem',
                textAlign: 'left',
                position: 'relative',
                backdropFilter: 'blur(12px)',
                transition: 'transform 0.3s, box-shadow 0.3s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = plan.highlight
                  ? '0 16px 48px rgba(16, 185, 129, 0.15)'
                  : '0 8px 32px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              {plan.badge && (
                <span style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                  color: '#022c22',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.3rem 0.9rem',
                  borderRadius: 999,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>
                  {plan.badge}
                </span>
              )}

              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#f1f5f9',
                marginBottom: '0.5rem',
              }}>
                {plan.name}
              </h3>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.5rem' }}>
                <span style={{
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  background: plan.highlight ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'none',
                  color: plan.highlight ? 'transparent' : '#f1f5f9',
                  WebkitBackgroundClip: plan.highlight ? 'text' : undefined,
                  WebkitTextFillColor: plan.highlight ? 'transparent' : undefined,
                }}>
                  {plan.price}
                </span>
                {plan.pricePer && (
                  <span style={{ fontSize: '0.9rem', color: '#64748b' }}>{plan.pricePer}</span>
                )}
              </div>

              <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                {plan.description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.75rem' }}>
                {plan.features.map((f, fi) => (
                  <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: f.included ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.1)',
                      color: f.included ? '#10b981' : '#475569',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {f.included ? '✓' : '—'}
                    </span>
                    <span style={{ color: f.included ? '#cbd5e1' : '#475569' }}>{f.text}</span>
                  </div>
                ))}
              </div>

              <a
                href={plan.ctaHref}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.825rem 1.5rem',
                  background: plan.highlight ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'rgba(255, 255, 255, 0.05)',
                  color: plan.highlight ? '#022c22' : '#f1f5f9',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  border: plan.highlight ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 10,
                  textDecoration: 'none',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

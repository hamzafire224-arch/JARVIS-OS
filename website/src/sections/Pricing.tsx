const plans = [
  {
    name: 'Balanced',
    price: 'Free',
    priceSub: 'Forever',
    description: 'Run JARVIS locally with Ollama. Your data stays on your machine.',
    badge: null,
    features: [
      { text: 'Ollama (local AI) — unlimited', included: true },
      { text: 'Core tools (filesystem, terminal, git)', included: true },
      { text: 'Working memory (24 items)', included: true },
      { text: 'Community support', included: true },
      { text: 'Cloud AI providers', included: false },
      { text: 'Full 4-layer memory system', included: false },
      { text: 'Multi-step autonomous execution', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Download Free',
    ctaHref: 'https://letjarvis.com/signup',
    highlight: false,
  },
  {
    name: 'Productivity',
    price: 'Free',
    priceSub: 'Open Source',
    description: 'Full power. All 25+ tools, cloud AI, 4-layer memory. Everything unlocked.',
    badge: 'RECOMMENDED',
    features: [
      { text: 'Everything in Balanced', included: true },
      { text: 'Cloud AI (Gemini, GPT-4, Claude)', included: true },
      { text: 'Full 4-layer memory system', included: true },
      { text: 'Multi-step autonomous execution', included: true },
      { text: 'Screen Use & browser control', included: true },
      { text: 'Workflow builder & MCP bridge', included: true },
      { text: 'Skill Marketplace access', included: true },
      { text: 'Priority support & updates', included: true },
    ],
    cta: 'Get Started Free',
    ctaHref: 'https://letjarvis.com/signup',
    highlight: true,
  },
]

export default function Pricing() {
  return (
    <section style={{ padding: '8rem 1.5rem' }}>
      <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto', textAlign: 'center' }}>
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
          fontSize: 'clamp(2rem, 5vw, 2.75rem)',
          fontWeight: 800,
          color: '#f1f5f9',
          marginBottom: '0.75rem',
        }}>
          Free & Open Source
        </h2>
        <p style={{
          color: '#94a3b8',
          fontSize: '1.1rem',
          marginBottom: '3.5rem',
          maxWidth: 520,
          margin: '0 auto 3.5rem',
          lineHeight: 1.7,
        }}>
          No hidden costs. No credit card. JARVIS is free to use — choose the plan that fits your workflow.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '2.5rem',
          maxWidth: 900,
          margin: '0 auto',
        }}>
          {plans.map((plan, i) => (
            <div
              key={i}
              style={{
                background: plan.highlight
                  ? 'linear-gradient(145deg, rgba(0, 168, 255, 0.06), rgba(16, 185, 129, 0.04))'
                  : 'rgba(10, 10, 16, 0.6)',
                border: plan.highlight
                  ? '1.5px solid rgba(0, 168, 255, 0.3)'
                  : '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 20,
                padding: '2.5rem 2rem',
                textAlign: 'left',
                position: 'relative',
                backdropFilter: 'blur(12px)',
                transition: 'transform 0.3s, box-shadow 0.3s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = plan.highlight
                  ? '0 20px 60px rgba(0, 168, 255, 0.15)'
                  : '0 12px 40px rgba(0, 0, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              {plan.badge && (
                <span style={{
                  position: 'absolute',
                  top: -14,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #00a8ff, #00e87b)',
                  color: '#022c22',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.35rem 1rem',
                  borderRadius: 999,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>
                  {plan.badge}
                </span>
              )}

              <h3 style={{
                fontSize: '1.3rem',
                fontWeight: 700,
                color: '#f1f5f9',
                marginBottom: '0.75rem',
              }}>
                {plan.name}
              </h3>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{
                  fontSize: '3rem',
                  fontWeight: 800,
                  background: plan.highlight ? 'linear-gradient(135deg, #00a8ff, #00e87b)' : 'none',
                  color: plan.highlight ? 'transparent' : '#f1f5f9',
                  WebkitBackgroundClip: plan.highlight ? 'text' : undefined,
                  WebkitTextFillColor: plan.highlight ? 'transparent' : undefined,
                }}>
                  {plan.price}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#00a8ff', fontWeight: 600, marginBottom: '1rem' }}>
                {plan.priceSub}
              </p>

              <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.6 }}>
                {plan.description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '2rem' }}>
                {plan.features.map((f, fi) => (
                  <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: f.included ? 'rgba(0, 232, 123, 0.12)' : 'rgba(100, 116, 139, 0.1)',
                      color: f.included ? '#00e87b' : '#475569',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
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
                  padding: '0.9rem 1.5rem',
                  background: plan.highlight ? 'linear-gradient(135deg, #00a8ff, #00e87b)' : 'rgba(255, 255, 255, 0.05)',
                  color: plan.highlight ? '#022c22' : '#f1f5f9',
                  fontWeight: 700,
                  fontSize: '1rem',
                  border: plan.highlight ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
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

import { useEffect } from 'react'

export default function TermsPage() {
  useEffect(() => { document.title = 'JARVIS — Terms of Service' }, [])

  return (
    <section style={{ padding: '10rem 1.5rem 6rem' }}>
      <div style={{ maxWidth: 800, width: '100%', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f0f0f5', marginBottom: '0.5rem' }}>
          Terms of Service
        </h1>
        <p style={{ color: '#55556a', fontSize: '0.9rem', marginBottom: '3rem' }}>
          Last updated: April 10, 2026
        </p>

        <div style={{ color: '#8888a0', fontSize: '1rem', lineHeight: 1.8 }}>
          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>1. Acceptance of Terms</h2>
          <p>By accessing or using PersonalJARVIS ("the Service"), operated by the team at letjarvis.com, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</p>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>2. Description of Service</h2>
          <p>PersonalJARVIS is an AI-powered developer assistant that runs locally on your machine with optional cloud-synced features. The Service includes:</p>
          <ul style={{ paddingLeft: '1.25rem' }}>
            <li>CLI agent with local and cloud AI model support</li>
            <li>Web dashboard for analytics, settings, and licence management</li>
            <li>Memory system for persistent project context</li>
            <li>Tool integrations and skill marketplace</li>
          </ul>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>3. Account Requirements</h2>
          <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your credentials and API keys. You must be at least 16 years old to use the Service.</p>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>4. Plans</h2>
          <p><strong style={{ color: '#f0f0f5' }}>Balanced (Free):</strong> Includes local AI models via Ollama, working + semantic memory, core skills, and basic security. Free forever.</p>
          <p><strong style={{ color: '#f0f0f5' }}>Productivity (Free):</strong> Includes everything in Balanced plus cloud AI providers, full 4-layer memory, advanced security, all marketplace skills, and priority support.</p>
          <p>JARVIS is free and open source. Both plans are available at no cost during the launch period.</p>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>5. Acceptable Use</h2>
          <p>You may not use PersonalJARVIS to:</p>
          <ul style={{ paddingLeft: '1.25rem' }}>
            <li>Generate malicious code, malware, or exploit tools</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on the intellectual property rights of others</li>
            <li>Abuse, harass, or harm other users or services</li>
            <li>Circumvent license restrictions or rate limits</li>
          </ul>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>6. Intellectual Property</h2>
          <p>Code and content you create with PersonalJARVIS belongs to you. The Service itself, including its branding, design, and codebase, is the intellectual property of the PersonalJARVIS team and is protected by applicable laws.</p>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>7. Limitation of Liability</h2>
          <p>PersonalJARVIS is provided "as is" without warranties. We are not liable for any damages arising from the use of AI-generated code, data loss, or service interruptions. You are responsible for reviewing and testing all generated output before use in production.</p>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>8. Termination</h2>
          <p>We reserve the right to suspend or terminate your account for violations of these terms. Upon termination, your locally stored data remains on your machine. Cloud data (account, telemetry) will be deleted within 30 days.</p>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>9. Open Source License</h2>
          <p>The PersonalJARVIS CLI is MIT licensed. You are free to fork, modify, and distribute it under the terms of the MIT license. The dashboard and cloud services are proprietary.</p>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>10. Contact</h2>
          <p>For questions about these terms, contact us at <a href="mailto:legal@letjarvis.com" style={{ color: '#00a8ff' }}>legal@letjarvis.com</a>.</p>
        </div>
      </div>
    </section>
  )
}

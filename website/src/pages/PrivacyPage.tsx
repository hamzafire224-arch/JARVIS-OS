import { useEffect } from 'react'

export default function PrivacyPage() {
  useEffect(() => { document.title = 'JARVIS — Privacy Policy' }, [])

  return (
    <section style={{ padding: '10rem 1.5rem 6rem' }}>
      <div style={{ maxWidth: 800, width: '100%', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f0f0f5', marginBottom: '0.5rem' }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#55556a', fontSize: '0.9rem', marginBottom: '3rem' }}>
          Last updated: April 10, 2026
        </p>

        <div style={{ color: '#8888a0', fontSize: '1rem', lineHeight: 1.8 }}>
          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>1. Overview</h2>
          <p>PersonalJARVIS ("we", "us", "our") respects your privacy. This policy explains what data we collect, why, how we use it, and your rights. We are committed to transparency and data minimalism.</p>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>2. Data We Collect</h2>
          <h3 style={{ color: '#f0f0f5', fontSize: '1.05rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>Account Data</h3>
          <ul style={{ paddingLeft: '1.25rem' }}>
            <li>Email address and full name (at signup)</li>
            <li>Authentication credentials (hashed, managed by Supabase)</li>
            <li>Subscription and billing status</li>
          </ul>

          <h3 style={{ color: '#f0f0f5', fontSize: '1.05rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>Usage Telemetry (Opt-in)</h3>
          <ul style={{ paddingLeft: '1.25rem' }}>
            <li>Session counts and durations</li>
            <li>Tool execution counts (not input/output content)</li>
            <li>Model provider usage statistics</li>
            <li>Memory item counts (not the content of memories)</li>
          </ul>
          <p style={{ marginTop: '0.5rem' }}><strong style={{ color: '#f0f0f5' }}>Important:</strong> We never collect the actual content of your code, conversations, files, or terminal commands. Telemetry consists only of aggregate counts and metadata.</p>

          <h3 style={{ color: '#f0f0f5', fontSize: '1.05rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>Data Stored Locally Only</h3>
          <p>The following data stays on your machine and is never transmitted to our servers:</p>
          <ul style={{ paddingLeft: '1.25rem' }}>
            <li>Your code, files, and project content</li>
            <li>Conversation history with JARVIS</li>
            <li>Memory system contents (preferences, facts, projects)</li>
            <li>Terminal command history and output</li>
            <li>API keys for third-party AI providers</li>
          </ul>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>3. How We Use Your Data</h2>
          <ul style={{ paddingLeft: '1.25rem' }}>
            <li>To provide and maintain the Service</li>
            <li>To manage your subscription and authentication</li>
            <li>To display usage analytics in your dashboard</li>
            <li>To improve the Service based on aggregate usage patterns</li>
            <li>To communicate important service updates</li>
          </ul>
          <p style={{ marginTop: '0.5rem' }}>We never sell your data. We never share your individual data with third parties for marketing.</p>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>4. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul style={{ paddingLeft: '1.25rem' }}>
            <li><strong style={{ color: '#f0f0f5' }}>Supabase:</strong> Database, authentication, and data storage (PostgreSQL with Row-Level Security)</li>
            <li><strong style={{ color: '#f0f0f5' }}>LemonSqueezy:</strong> Payment processing and subscription management</li>
            <li><strong style={{ color: '#f0f0f5' }}>Vercel:</strong> Dashboard hosting and CDN</li>
          </ul>
          <p style={{ marginTop: '0.5rem' }}>When using cloud AI features, your prompts are sent to your configured AI providers (OpenAI, Google, Anthropic). Each provider has its own privacy policy. JARVIS does not store or cache these interactions on our servers.</p>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>5. Data Security</h2>
          <p>All data in transit is encrypted via TLS. Data at rest is encrypted by Supabase. Database access is controlled by Row-Level Security policies — each user can only access their own data.</p>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>6. Data Retention</h2>
          <p>Account data is retained for the duration of your account. Telemetry data is retained for 12 months. Upon account deletion, all associated data is permanently removed within 30 days.</p>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>7. Your Rights</h2>
          <ul style={{ paddingLeft: '1.25rem' }}>
            <li><strong style={{ color: '#f0f0f5' }}>Access:</strong> View all your data from the dashboard</li>
            <li><strong style={{ color: '#f0f0f5' }}>Correction:</strong> Update your profile in dashboard settings</li>
            <li><strong style={{ color: '#f0f0f5' }}>Deletion:</strong> Delete your account from dashboard settings</li>
            <li><strong style={{ color: '#f0f0f5' }}>Export:</strong> Request a data export by contacting support</li>
            <li><strong style={{ color: '#f0f0f5' }}>Opt-out:</strong> Disable telemetry in JARVIS CLI settings</li>
          </ul>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>8. Cookies</h2>
          <p>We use essential cookies only for authentication session management. We do not use tracking cookies or third-party analytics cookies.</p>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>9. Changes to This Policy</h2>
          <p>We will notify you of material changes via email or dashboard notification. Continued use after changes constitutes acceptance.</p>

          <h2 style={{ color: '#f0f0f5', fontSize: '1.25rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>10. Contact</h2>
          <p>For privacy questions or data requests, contact us at <a href="mailto:privacy@letjarvis.com" style={{ color: '#00a8ff' }}>privacy@letjarvis.com</a>.</p>
        </div>
      </div>
    </section>
  )
}

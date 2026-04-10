export default function TermsOfService() {
    return (
        <div className="auth-page" style={{ alignItems: 'flex-start', padding: '2rem' }}>
            <div className="auth-card" style={{ maxWidth: 800, padding: '3rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Terms of Service
                </h1>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                    Last updated: April 10, 2026
                </p>

                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8 }}>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem' }}>1. Acceptance of Terms</h2>
                    <p>By accessing or using PersonalJARVIS (&quot;the Service&quot;), operated by the team at letjarvis.com, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</p>

                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem' }}>2. Description of Service</h2>
                    <p>PersonalJARVIS is an AI-powered developer assistant that runs locally on your machine with optional cloud-synced features. The Service includes:</p>
                    <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
                        <li>A locally-installed CLI application</li>
                        <li>A web-based dashboard for account management</li>
                        <li>Cloud AI provider integrations (Productivity plan)</li>
                        <li>Optional telemetry and usage analytics</li>
                    </ul>

                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem' }}>3. Account Registration</h2>
                    <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials and license key. You must notify us immediately of any unauthorized use.</p>

                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem' }}>4. Subscription Plans</h2>
                    <p><strong>Balanced (Free):</strong> Includes local AI models via Ollama, working + semantic memory, core skills, and basic security. Free forever.</p>
                    <p><strong>Productivity ($20/month):</strong> Includes everything in Balanced plus cloud AI providers, full 4-layer memory, advanced security, all marketplace skills, and priority support.</p>
                    <p>During the launch period, Productivity features are available to all users at no cost. We will provide advance notice before any billing begins.</p>

                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem' }}>5. Billing and Payments</h2>
                    <p>Payments are processed through LemonSqueezy. Subscriptions are billed monthly. You can cancel at any time from the customer portal. Upon cancellation, you retain access until the end of your billing period. A 7-day grace period applies for failed payments before service interruption.</p>

                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem' }}>6. Acceptable Use</h2>
                    <p>You may not use PersonalJARVIS to:</p>
                    <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
                        <li>Generate malicious code or malware</li>
                        <li>Circumvent security measures or access systems without authorization</li>
                        <li>Violate applicable laws or third-party rights</li>
                        <li>Reverse-engineer, decompile, or modify the Service in unauthorized ways</li>
                        <li>Share your license key with unauthorized users</li>
                    </ul>

                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem' }}>7. Intellectual Property</h2>
                    <p>Code and content you create with PersonalJARVIS belongs to you. The Service itself, including its branding, design, and codebase, is the intellectual property of the PersonalJARVIS team and is protected by applicable laws.</p>

                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem' }}>8. Limitation of Liability</h2>
                    <p>PersonalJARVIS is provided &quot;as is&quot; without warranties. We are not liable for any damages arising from the use of AI-generated code, data loss, or service interruptions. You are responsible for reviewing and testing all generated output before use in production.</p>

                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem' }}>9. Termination</h2>
                    <p>We may terminate or suspend your account for violations of these terms. You may delete your account at any time through the dashboard settings or by contacting support.</p>

                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem' }}>10. Changes to Terms</h2>
                    <p>We may update these terms from time to time. We will notify you of material changes via email or through the dashboard. Continued use after changes constitutes acceptance.</p>

                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem' }}>11. Contact</h2>
                    <p>For questions about these terms, contact us at <a href="mailto:support@letjarvis.com">support@letjarvis.com</a>.</p>
                </div>
            </div>
        </div>
    );
}

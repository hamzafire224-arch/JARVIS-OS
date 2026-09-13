'use client';

interface PasswordStrengthProps {
    password: string;
}

type Strength = 'weak' | 'fair' | 'good' | 'strong';

const strengthConfig: Record<Strength, { label: string; color: string; segClass: string }> = {
    weak: { label: 'Weak', color: 'var(--error)', segClass: 'active-weak' },
    fair: { label: 'Fair', color: 'var(--warning)', segClass: 'active-fair' },
    good: { label: 'Good', color: '#eab308', segClass: 'active-good' },
    strong: { label: 'Strong', color: 'var(--success)', segClass: 'active-strong' },
};

function evaluateStrength(pw: string): { strength: Strength; score: number; checks: Record<string, boolean> } {
    const checks = {
        length: pw.length >= 8,
        upper: /[A-Z]/.test(pw),
        lower: /[a-z]/.test(pw),
        number: /\d/.test(pw),
        special: /[^A-Za-z0-9]/.test(pw),
    };

    const score = Object.values(checks).filter(Boolean).length;

    if (score <= 1) return { strength: 'weak', score, checks };
    if (score <= 2) return { strength: 'fair', score, checks };
    if (score <= 3) return { strength: 'good', score, checks };
    return { strength: 'strong', score, checks };
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
    if (!password) return null;

    const { strength, score, checks } = evaluateStrength(password);
    const config = strengthConfig[strength];
    const strengthOrder: Strength[] = ['weak', 'fair', 'good', 'strong'];
    const strengthIndex = strengthOrder.indexOf(strength);

    return (
        <div className="password-strength">
            <div className="strength-bar-track">
                {[0, 1, 2, 3].map(i => (
                    <div
                        key={i}
                        className={`strength-bar-seg ${i <= strengthIndex ? config.segClass : ''}`}
                    />
                ))}
            </div>
            <div className="strength-label" style={{ color: config.color }}>
                {config.label}
            </div>
            <div className="strength-reqs">
                <div className={`strength-req ${checks.length ? 'met' : ''}`}>
                    {checks.length ? '✓' : '○'} At least 8 characters
                </div>
                <div className={`strength-req ${checks.upper ? 'met' : ''}`}>
                    {checks.upper ? '✓' : '○'} Uppercase letter
                </div>
                <div className={`strength-req ${checks.lower ? 'met' : ''}`}>
                    {checks.lower ? '✓' : '○'} Lowercase letter
                </div>
                <div className={`strength-req ${checks.number ? 'met' : ''}`}>
                    {checks.number ? '✓' : '○'} Number
                </div>
                <div className={`strength-req ${checks.special ? 'met' : ''}`}>
                    {checks.special ? '✓' : '○'} Special character
                </div>
            </div>
        </div>
    );
}

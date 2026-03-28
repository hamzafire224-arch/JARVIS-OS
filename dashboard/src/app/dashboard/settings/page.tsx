'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/ThemeProvider';

const themes = [
    { id: 'dark', name: 'Dark', preview: 'linear-gradient(135deg, #0a0b10, #161822)' },
    { id: 'light', name: 'Light', preview: 'linear-gradient(135deg, #ffffff, #f1f5f9)' },
    { id: 'midnight', name: 'Midnight', preview: 'linear-gradient(135deg, #020617, #1e293b)' },
    { id: 'emerald', name: 'Emerald', preview: 'linear-gradient(135deg, #022c22, #065f46)' },
    { id: 'system', name: 'System', preview: 'linear-gradient(135deg, #0a0b10 50%, #ffffff 50%)' },
] as const;

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSaved, setPasswordSaved] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    // Preferences (stored in localStorage)
    const [defaultProvider, setDefaultProvider] = useState('gemini');
    const [securityMode, setSecurityMode] = useState(true);
    const [emailNotifs, setEmailNotifs] = useState(true);
    const [usageReports, setUsageReports] = useState(false);
    const [productUpdates, setProductUpdates] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setFullName(user.user_metadata?.full_name || '');
                setEmail(user.email || '');
            }
        };
        loadUser();

        // Load preferences
        try {
            const prefs = JSON.parse(localStorage.getItem('jarvis-prefs') || '{}');
            if (prefs.defaultProvider) setDefaultProvider(prefs.defaultProvider);
            if (prefs.securityMode !== undefined) setSecurityMode(prefs.securityMode);
            if (prefs.emailNotifs !== undefined) setEmailNotifs(prefs.emailNotifs);
            if (prefs.usageReports !== undefined) setUsageReports(prefs.usageReports);
            if (prefs.productUpdates !== undefined) setProductUpdates(prefs.productUpdates);
        } catch {}
    }, []);

    const savePrefs = (updates: Record<string, unknown>) => {
        try {
            const current = JSON.parse(localStorage.getItem('jarvis-prefs') || '{}');
            const updated = { ...current, ...updates };
            localStorage.setItem('jarvis-prefs', JSON.stringify(updated));
        } catch {}
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSaved(false);
        const supabase = createClient();
        await supabase.auth.updateUser({ data: { full_name: fullName } });
        setSaved(true);
        setLoading(false);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordLoading(true);
        setError('');
        setPasswordSaved(false);

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.');
            setPasswordLoading(false);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            setPasswordLoading(false);
            return;
        }

        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

        if (updateError) {
            setError(updateError.message);
            setPasswordLoading(false);
            return;
        }

        setPasswordSaved(true);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordLoading(false);
        setTimeout(() => setPasswordSaved(false), 3000);
    };

    return (
        <>
            <div className="dashboard-header">
                <h1>Settings</h1>
                <p>Manage your profile, theme, preferences, and security.</p>
            </div>

            <div className="dashboard-content">
                {/* Theme */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <h3 className="card-title">🎨 Appearance</h3>
                    </div>
                    <p className="card-description" style={{ marginBottom: '1rem' }}>
                        Choose your preferred dashboard theme.
                    </p>
                    <div className="theme-grid">
                        {themes.map((t) => (
                            <button
                                key={t.id}
                                className={`theme-card ${theme === t.id ? 'active' : ''}`}
                                onClick={() => setTheme(t.id as typeof theme)}
                            >
                                <div className="theme-card-preview" style={{ background: t.preview }} />
                                <div className="theme-card-name">{t.name}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* JARVIS Preferences */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <h3 className="card-title">⚙️ JARVIS Preferences</h3>
                    </div>

                    <div className="form-group">
                        <label htmlFor="provider">Default AI Provider</label>
                        <select
                            id="provider"
                            className="form-select"
                            value={defaultProvider}
                            onChange={(e) => {
                                setDefaultProvider(e.target.value);
                                savePrefs({ defaultProvider: e.target.value });
                            }}
                            style={{ maxWidth: 300 }}
                        >
                            <option value="gemini">Gemini (Recommended)</option>
                            <option value="openai">OpenAI (GPT-4)</option>
                            <option value="anthropic">Anthropic (Claude)</option>
                            <option value="ollama">Ollama (Local, Free)</option>
                        </select>
                    </div>

                    <div className="toggle-group">
                        <div className="toggle-label">
                            <span>Security Framework</span>
                            <span>Block dangerous commands and protect sensitive files</span>
                        </div>
                        <button
                            className={`toggle-switch ${securityMode ? 'active' : ''}`}
                            onClick={() => {
                                setSecurityMode(!securityMode);
                                savePrefs({ securityMode: !securityMode });
                            }}
                        />
                    </div>
                </div>

                {/* Notifications */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <h3 className="card-title">🔔 Notifications</h3>
                    </div>

                    <div className="toggle-group">
                        <div className="toggle-label">
                            <span>Email Notifications</span>
                            <span>Subscription updates, billing alerts, security notices</span>
                        </div>
                        <button
                            className={`toggle-switch ${emailNotifs ? 'active' : ''}`}
                            onClick={() => {
                                setEmailNotifs(!emailNotifs);
                                savePrefs({ emailNotifs: !emailNotifs });
                            }}
                        />
                    </div>

                    <div className="toggle-group">
                        <div className="toggle-label">
                            <span>Weekly Usage Reports</span>
                            <span>Receive a summary of your JARVIS usage each week</span>
                        </div>
                        <button
                            className={`toggle-switch ${usageReports ? 'active' : ''}`}
                            onClick={() => {
                                setUsageReports(!usageReports);
                                savePrefs({ usageReports: !usageReports });
                            }}
                        />
                    </div>

                    <div className="toggle-group">
                        <div className="toggle-label">
                            <span>Product Updates</span>
                            <span>New features, improvements, and release announcements</span>
                        </div>
                        <button
                            className={`toggle-switch ${productUpdates ? 'active' : ''}`}
                            onClick={() => {
                                setProductUpdates(!productUpdates);
                                savePrefs({ productUpdates: !productUpdates });
                            }}
                        />
                    </div>
                </div>

                {/* Profile */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <h3 className="card-title">👤 Profile</h3>
                    </div>
                    <form onSubmit={handleSaveProfile}>
                        <div className="form-group">
                            <label htmlFor="name">Full Name</label>
                            <input
                                id="name"
                                type="text"
                                className="form-input"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                style={{ maxWidth: 400 }}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email-display">Email</label>
                            <input
                                id="email-display"
                                type="email"
                                className="form-input"
                                value={email}
                                disabled
                                style={{ maxWidth: 400 }}
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                                Email cannot be changed
                            </p>
                        </div>
                        <button className="btn-primary" type="submit" disabled={loading} style={{ maxWidth: 160 }}>
                            {loading ? <span className="spinner" /> : saved ? '✓ Saved' : 'Save Changes'}
                        </button>
                    </form>
                </div>

                {/* Change Password */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <h3 className="card-title">🔒 Change Password</h3>
                    </div>
                    {error && <div className="alert alert-error">{error}</div>}
                    {passwordSaved && <div className="alert alert-success">Password updated successfully!</div>}
                    <form onSubmit={handleChangePassword}>
                        <div className="form-group">
                            <label htmlFor="new-password">New Password</label>
                            <input
                                id="new-password"
                                type="password"
                                className="form-input"
                                placeholder="Min. 8 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                style={{ maxWidth: 400 }}
                                minLength={8}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="confirm-password">Confirm Password</label>
                            <input
                                id="confirm-password"
                                type="password"
                                className="form-input"
                                placeholder="Re-enter password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                style={{ maxWidth: 400 }}
                                minLength={8}
                            />
                        </div>
                        <button className="btn-primary" type="submit" disabled={passwordLoading} style={{ maxWidth: 180 }}>
                            {passwordLoading ? <span className="spinner" /> : 'Update Password'}
                        </button>
                    </form>
                </div>

                {/* Danger Zone */}
                <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                    <div className="card-header">
                        <h3 className="card-title" style={{ color: 'var(--error)' }}>⚠️ Danger Zone</h3>
                    </div>
                    <p className="card-description" style={{ marginBottom: '1rem' }}>
                        Deleting your account will cancel your subscription, revoke all licenses, and permanently
                        remove your data. This action cannot be undone.
                    </p>
                    <button
                        className="btn-secondary"
                        style={{
                            maxWidth: 180,
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            color: 'var(--error)',
                        }}
                        onClick={() => {
                            if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                                alert('Account deletion is handled via support. Please email support@personaljarvis.dev');
                            }
                        }}
                    >
                        Delete Account
                    </button>
                </div>
            </div>
        </>
    );
}

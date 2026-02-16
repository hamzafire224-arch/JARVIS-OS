'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSaved, setPasswordSaved] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

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
    }, []);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSaved(false);

        const supabase = createClient();
        await supabase.auth.updateUser({
            data: { full_name: fullName },
        });

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
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
        });

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
                <p>Manage your profile and security preferences.</p>
            </div>

            <div className="dashboard-content">
                {/* Profile */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <h3 className="card-title">Profile</h3>
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
                                style={{ maxWidth: 400, background: '#f3f4f6', color: '#9ca3af' }}
                            />
                            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
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
                        <h3 className="card-title">Change Password</h3>
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
                <div className="card" style={{ borderColor: '#fecaca' }}>
                    <div className="card-header">
                        <h3 className="card-title" style={{ color: '#dc2626' }}>Danger Zone</h3>
                    </div>
                    <p className="card-description" style={{ marginBottom: '1rem' }}>
                        Deleting your account will cancel your subscription, revoke all licenses, and permanently
                        remove your data. This action cannot be undone.
                    </p>
                    <button
                        className="btn-secondary"
                        style={{
                            maxWidth: 180,
                            borderColor: '#fca5a5',
                            color: '#dc2626',
                        }}
                        onClick={() => {
                            if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                                // TODO: Implement account deletion
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

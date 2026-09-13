'use client';

import { useState, useEffect, useCallback } from 'react';
import { useErrorToast } from '@/components/ErrorToast';

interface Skill {
    id?: string;
    name: string;
    description: string;
    category: string;
    icon: string;
    downloads: number;
    rating: number;
    verified: boolean;
}

const CATEGORIES = ['All', 'Development', 'Data', 'Automation', 'Communication', 'Productivity', 'Utility'];

export default function MarketplacePage() {
    const { showError } = useErrorToast();
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [installed, setInstalled] = useState<Set<string>>(new Set());

    const fetchSkills = useCallback(async () => {
        try {
            const res = await fetch('/api/marketplace/skills');
            if (res.ok) {
                const data = await res.json();
                setSkills(data.skills || data.featured || []);
            }
        } catch (err) {
            showError(err instanceof Error ? err.message : 'An error occurred');
            // Silently fail
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSkills();
    }, [fetchSkills]);

    const handleInstall = (name: string) => {
        setInstalled(prev => new Set(prev).add(name));
    };

    const formatDownloads = (n: number): string => {
        if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
        return String(n);
    };

    const renderStars = (rating: number): string => {
        const full = Math.floor(rating);
        const half = rating % 1 >= 0.5 ? 1 : 0;
        return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
    };

    const filtered = skills.filter(s => {
        const matchCategory = category === 'All' || s.category.toLowerCase() === category.toLowerCase();
        const matchSearch = !search ||
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.description.toLowerCase().includes(search.toLowerCase());
        return matchCategory && matchSearch;
    });

    if (loading) {
        return (
            <div>
                <h1>Skill <span className="text-gradient">Marketplace</span></h1>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: '1.5rem' }}>
                    Extend JARVIS with community-built capabilities
                </p>
                <div className="marketplace-grid">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="skill-card" style={{ opacity: 0.5 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--border-subtle, rgba(255,255,255,0.06))', marginBottom: '0.75rem' }} />
                            <div style={{ width: '60%', height: 14, borderRadius: 4, background: 'var(--border-subtle, rgba(255,255,255,0.06))', marginBottom: '0.5rem' }} />
                            <div style={{ width: '90%', height: 10, borderRadius: 4, background: 'var(--border-subtle, rgba(255,255,255,0.06))', marginBottom: '0.5rem' }} />
                            <div style={{ width: '100%', height: 32, borderRadius: 8, background: 'var(--border-subtle, rgba(255,255,255,0.06))', marginTop: '0.75rem' }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <h1>Skill <span className="text-gradient">Marketplace</span></h1>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Extend JARVIS with community-built capabilities
            </p>

            {/* Search */}
            <div style={{ position: 'relative', marginTop: '1.25rem' }}>
                <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
                >
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    className="marketplace-search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search skills..."
                />
            </div>

            {/* Category Tabs */}
            <div className="marketplace-tabs">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        className={`marketplace-tab ${category === cat ? 'active' : ''}`}
                        onClick={() => setCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Results count */}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
                {filtered.length} skill{filtered.length !== 1 ? 's' : ''} found
            </div>

            {/* Skills Grid */}
            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-tertiary)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No skills found</div>
                    <div style={{ fontSize: '0.825rem' }}>Try a different search or category</div>
                </div>
            ) : (
                <div className="marketplace-grid">
                    {filtered.map((skill, i) => {
                        const isInstalled = installed.has(skill.name);
                        return (
                            <div
                                key={skill.name + i}
                                className="skill-card fade-in-up"
                                style={{ animationDelay: `${i * 40}ms` }}
                            >
                                <div className="skill-icon">{skill.icon}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <div className="skill-name">{skill.name}</div>
                                    {skill.verified && (
                                        <span className="skill-verified">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--accent-1, #00d4ff)" stroke="none">
                                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                <circle cx="12" cy="12" r="10" fill="none" stroke="var(--accent-1, #00d4ff)" strokeWidth="2" />
                                                <polyline points="9 12 11.5 14.5 16 9.5" fill="none" stroke="var(--accent-1, #00d4ff)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Verified
                                        </span>
                                    )}
                                </div>
                                <div className="skill-desc">{skill.description}</div>
                                <div className="skill-meta">
                                    <span className="skill-downloads">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                        {formatDownloads(skill.downloads)}
                                    </span>
                                    <span className="skill-rating">
                                        {renderStars(skill.rating)} {skill.rating.toFixed(1)}
                                    </span>
                                </div>
                                <button
                                    className={`btn-install ${isInstalled ? 'installed' : ''}`}
                                    onClick={() => !isInstalled && handleInstall(skill.name)}
                                    disabled={isInstalled}
                                >
                                    {isInstalled ? (
                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            Installed
                                        </span>
                                    ) : 'Install'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useErrorToast } from '@/components/ErrorToast';

/**
 * Market Research & Disruption Dashboard
 *
 * Features:
 * - Overview stats (competitors, gaps, pricing, reports)
 * - TAM/NPS Opportunity Matrix (glassmorphic)
 * - Competitor Action Engine (add/track competitors)
 * - Market Gap cards with priority badges
 */

interface Overview {
    competitors: number;
    gaps: number;
    pricingSnapshots: number;
    reports: number;
}

interface Competitor {
    id: string;
    name: string;
    website_url: string | null;
    social_handles: Record<string, string>;
    industry: string;
    notes: string;
    created_at: string;
}

interface MarketGap {
    id: string;
    opportunity_name: string;
    tam_estimate: number | null;
    nps_score: number | null;
    segment: string;
    gap_description: string;
    strategy_notes: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: string;
    created_at: string;
}

const PRIORITY_CONFIG = {
    low: { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', label: 'Low' },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'Medium' },
    high: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', label: 'High' },
    critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', label: 'Critical' },
};

interface IndustryPlaybook {
    id: string;
    sector: string;
    icon: string;
    tam: string;
    nps: number;
    angle: string;
    gaps: {
        opportunity_name: string;
        tam_estimate: number;
        nps_score: number;
        segment: string;
        gap_description: string;
        priority: 'low' | 'medium' | 'high' | 'critical';
    }[];
}
export default function ResearchPage() {
    const [overview, setOverview] = useState<Overview>({ competitors: 0, gaps: 0, pricingSnapshots: 0, reports: 0 });
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [gaps, setGaps] = useState<MarketGap[]>([]);
    const [playbooks, setPlaybooks] = useState<IndustryPlaybook[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'matrix' | 'competitors' | 'gaps' | 'playbooks'>('matrix');
    const [activatingPlaybook, setActivatingPlaybook] = useState<string | null>(null);
    const { showError, showSuccess, ToastContainer } = useErrorToast();

    // Add competitor form
    const [showAddCompetitor, setShowAddCompetitor] = useState(false);
    const [newCompetitor, setNewCompetitor] = useState({ name: '', website_url: '', industry: '', twitter: '', linkedin: '' });
    const [adding, setAdding] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [overviewRes, compRes, gapRes, pbRes] = await Promise.all([
                fetch('/api/research?type=overview'),
                fetch('/api/research?type=competitors'),
                fetch('/api/research?type=gaps'),
                fetch('/api/research/playbooks'),
            ]);

            if (overviewRes.ok) {
                const d = await overviewRes.json();
                setOverview(d.overview || { competitors: 0, gaps: 0, pricingSnapshots: 0, reports: 0 });
            }
            if (compRes.ok) {
                const d = await compRes.json();
                setCompetitors(d.competitors || []);
            }
            if (gapRes.ok) {
                const d = await gapRes.json();
                setGaps(d.gaps || []);
            }
            if (pbRes.ok) {
                const d = await pbRes.json();
                setPlaybooks(d.playbooks || []);
            }
        } catch (err) {
            console.error('[Research] Fetch error:', err);
            showError('Failed to load research data. Please refresh.');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAddCompetitor = async () => {
        if (!newCompetitor.name.trim() || adding) return;
        setAdding(true);
        try {
            const res = await fetch('/api/research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'competitor',
                    name: newCompetitor.name,
                    website_url: newCompetitor.website_url || null,
                    industry: newCompetitor.industry,
                    social_handles: {
                        ...(newCompetitor.twitter ? { twitter: newCompetitor.twitter } : {}),
                        ...(newCompetitor.linkedin ? { linkedin: newCompetitor.linkedin } : {}),
                    },
                }),
            });
            if (res.ok) {
                setNewCompetitor({ name: '', website_url: '', industry: '', twitter: '', linkedin: '' });
                setShowAddCompetitor(false);
                fetchData();
            }
        } catch (err) {
            console.error('[Research] Add competitor error:', err);
            showError('Failed to add competitor. Please try again.');
        } finally {
            setAdding(false);
        }
    };

    const formatTam = (n: number | null): string => {
        if (!n) return '—';
        if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
        if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
        if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
        return `$${n}`;
    };

    const STAT_CARDS = [
        { label: 'Competitors Tracked', value: overview.competitors, icon: '🎯', accent: '#00d4ff' },
        { label: 'Market Gaps', value: overview.gaps, icon: '🔍', accent: '#a855f7' },
        { label: 'Pricing Snapshots', value: overview.pricingSnapshots, icon: '💰', accent: '#22c55e' },
        { label: 'Intel Reports', value: overview.reports, icon: '📊', accent: '#f59e0b' },
    ];

    const TABS = [
        { key: 'matrix' as const, label: 'TAM/NPS Matrix', icon: '📐' },
        { key: 'competitors' as const, label: 'Competitor Engine', icon: '🎯' },
        { key: 'gaps' as const, label: 'Opportunities', icon: '💎' },
        { key: 'playbooks' as const, label: 'Industry Playbooks', icon: '🏗️' },
    ];

    const activatePlaybook = async (playbook: IndustryPlaybook) => {
        setActivatingPlaybook(playbook.id);
        try {
            for (const gap of playbook.gaps) {
                await fetch('/api/research', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'gap',
                        ...gap,
                        status: 'identified',
                    }),
                });
            }
            showSuccess(`${playbook.sector} playbook activated with ${playbook.gaps.length} opportunities.`);
            fetchData();
        } catch (err) {
            console.error('[Research] Activate playbook error:', err);
            showError('Failed to activate playbook. Please try again.');
        } finally {
            setActivatingPlaybook(null);
        }
    };

    return (
        <div>
            {/* Header */}
            <h1>Market <span className="text-gradient">Intelligence</span></h1>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.825rem', margin: '0.25rem 0 1.5rem' }}>
                Competitive analysis, market gaps, and disruption strategies
            </p>

            {/* Stats Row */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
                {STAT_CARDS.map(card => (
                    <div key={card.label} className="stat-card card-glass animate-in" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            position: 'absolute', top: -20, right: -20, width: 80, height: 80,
                            borderRadius: '50%', background: `${card.accent}08`,
                        }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 10,
                                background: `${card.accent}12`, border: `1px solid ${card.accent}25`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem',
                            }}>
                                {card.icon}
                            </div>
                            <div>
                                <div className="stat-label">{card.label}</div>
                                <div className="stat-value" style={{ marginTop: '0.2rem', color: card.accent }}>{loading ? '—' : card.value}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tab Navigation */}
            <div className="marketplace-tabs" style={{ marginTop: 0, marginBottom: '1.25rem' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        className={`marketplace-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <span style={{ marginRight: '0.375rem' }}>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══ TAM/NPS Matrix ═══ */}
            {activeTab === 'matrix' && (
                <div className="card card-glass fade-in-up" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <div>
                            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Opportunity Matrix</h3>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                                High TAM / Low NPS = Maximum disruption opportunity
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                                <span style={{ color: 'var(--text-tertiary)' }}>Pursuing</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                                <span style={{ color: 'var(--text-tertiary)' }}>Validated</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                                <span style={{ color: 'var(--text-tertiary)' }}>Identified</span>
                            </div>
                        </div>
                    </div>

                    {/* Matrix Visualization */}
                    <div style={{
                        position: 'relative',
                        width: '100%', height: 380,
                        background: 'rgba(0,0,0,0.25)',
                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                        borderRadius: 14, overflow: 'hidden',
                    }}>
                        {/* Quadrant labels */}
                        <div style={{ position: 'absolute', top: 12, left: 16, fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            High TAM / Low NPS<br /><span style={{ color: '#22c55e', fontSize: '0.7rem' }}>🎯 Strike Zone</span>
                        </div>
                        <div style={{ position: 'absolute', top: 12, right: 16, fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                            High TAM / High NPS<br /><span style={{ fontSize: '0.7rem' }}>⚔️ Compete</span>
                        </div>
                        <div style={{ position: 'absolute', bottom: 12, left: 16, fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Low TAM / Low NPS<br /><span style={{ fontSize: '0.7rem' }}>⏭️ Skip</span>
                        </div>
                        <div style={{ position: 'absolute', bottom: 12, right: 16, fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                            Low TAM / High NPS<br /><span style={{ fontSize: '0.7rem' }}>🔬 Niche</span>
                        </div>

                        {/* Axes */}
                        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.06)' }} />
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.06)' }} />

                        {/* Axis Labels */}
                        <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                            NPS →
                        </div>
                        <div style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                            TAM →
                        </div>

                        {/* Plot points */}
                        {gaps.length > 0 ? gaps.map((gap, i) => {
                            const tam = gap.tam_estimate || 0;
                            const nps = gap.nps_score ?? 50;
                            // Normalize: TAM -> Y (higher = top), NPS -> X (higher = right)
                            const maxTam = Math.max(...gaps.map(g => g.tam_estimate || 0), 1);
                            const x = ((nps + 100) / 200) * 85 + 5; // -100..100 -> 5%..90%
                            const y = (1 - tam / maxTam) * 85 + 5; // Inverted: high TAM = top
                            const statusColor = gap.status === 'pursuing' ? '#22c55e' : gap.status === 'validated' ? '#f59e0b' : '#ef4444';

                            return (
                                <div
                                    key={gap.id}
                                    title={`${gap.opportunity_name}\nTAM: ${formatTam(gap.tam_estimate)}\nNPS: ${gap.nps_score ?? 'N/A'}`}
                                    style={{
                                        position: 'absolute',
                                        left: `${x}%`, top: `${y}%`,
                                        width: 14, height: 14, borderRadius: '50%',
                                        background: statusColor,
                                        border: '2px solid rgba(0,0,0,0.3)',
                                        boxShadow: `0 0 12px ${statusColor}60`,
                                        cursor: 'pointer',
                                        transform: 'translate(-50%, -50%)',
                                        animation: `fade-in 0.3s ease ${i * 60}ms both`,
                                        zIndex: 10,
                                    }}
                                />
                            );
                        }) : (
                            <div style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexDirection: 'column', gap: '0.5rem',
                            }}>
                                <span style={{ fontSize: '2rem' }}>📐</span>
                                <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    No opportunities mapped yet
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    Add market gaps to visualize your disruption matrix
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ Competitor Action Engine ═══ */}
            {activeTab === 'competitors' && (
                <div className="fade-in-up">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                            {competitors.length} competitor{competitors.length !== 1 ? 's' : ''} tracked
                        </div>
                        <button
                            onClick={() => setShowAddCompetitor(!showAddCompetitor)}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: 10,
                                background: 'var(--accent-1, #00d4ff)', color: '#000',
                                border: 'none', fontWeight: 600, fontSize: '0.8rem',
                                cursor: 'pointer',
                            }}
                        >
                            + Add Competitor
                        </button>
                    </div>

                    {/* Add Competitor Form */}
                    {showAddCompetitor && (
                        <div className="card card-glass" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                            <h4 style={{ margin: '0 0 1rem', fontWeight: 700, fontSize: '0.9rem' }}>Track New Competitor</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <input
                                    placeholder="Company name *"
                                    value={newCompetitor.name}
                                    onChange={e => setNewCompetitor(p => ({ ...p, name: e.target.value }))}
                                    style={inputStyle}
                                />
                                <input
                                    placeholder="Website URL"
                                    value={newCompetitor.website_url}
                                    onChange={e => setNewCompetitor(p => ({ ...p, website_url: e.target.value }))}
                                    style={inputStyle}
                                />
                                <input
                                    placeholder="Industry / Sector"
                                    value={newCompetitor.industry}
                                    onChange={e => setNewCompetitor(p => ({ ...p, industry: e.target.value }))}
                                    style={inputStyle}
                                />
                                <input
                                    placeholder="Twitter / X handle"
                                    value={newCompetitor.twitter}
                                    onChange={e => setNewCompetitor(p => ({ ...p, twitter: e.target.value }))}
                                    style={inputStyle}
                                />
                                <input
                                    placeholder="LinkedIn URL"
                                    value={newCompetitor.linkedin}
                                    onChange={e => setNewCompetitor(p => ({ ...p, linkedin: e.target.value }))}
                                    style={inputStyle}
                                />
                                <button
                                    onClick={handleAddCompetitor}
                                    disabled={!newCompetitor.name.trim() || adding}
                                    style={{
                                        padding: '0.6rem', borderRadius: 10,
                                        background: 'var(--accent-1, #00d4ff)', color: '#000',
                                        border: 'none', fontWeight: 600, fontSize: '0.825rem',
                                        cursor: !newCompetitor.name.trim() || adding ? 'not-allowed' : 'pointer',
                                        opacity: !newCompetitor.name.trim() || adding ? 0.5 : 1,
                                    }}
                                >
                                    {adding ? 'Adding...' : 'Track Competitor'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Competitor Cards */}
                    {competitors.length === 0 ? (
                        <div className="card card-glass" style={{ padding: '3rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎯</div>
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No competitors tracked</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                Add competitor URLs and social handles. JARVIS will monitor pricing changes and generate counter-strategies.
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                            {competitors.map((comp, i) => (
                                <div key={comp.id} className="card card-glass fade-in-up" style={{ padding: '1.25rem', animationDelay: `${i * 40}ms` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10,
                                            background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 800, fontSize: '1rem', color: 'var(--accent-1, #00d4ff)',
                                        }}>
                                            {comp.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{comp.name}</div>
                                            {comp.industry && (
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{comp.industry}</div>
                                            )}
                                        </div>
                                    </div>

                                    {comp.website_url && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-1, #00d4ff)', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            🔗 {comp.website_url}
                                        </div>
                                    )}

                                    {Object.keys(comp.social_handles).length > 0 && (
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                            {Object.entries(comp.social_handles).map(([platform, handle]) => (
                                                <span key={platform} style={{
                                                    fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: 4,
                                                    background: 'rgba(0,212,255,0.08)', color: 'var(--text-secondary)',
                                                }}>
                                                    {platform}: {handle}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                                        Added {new Date(comp.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ Market Gaps / Opportunities ═══ */}
            {activeTab === 'gaps' && (
                <div className="fade-in-up">
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
                        {gaps.length} opportunit{gaps.length !== 1 ? 'ies' : 'y'} identified
                    </div>

                    {gaps.length === 0 ? (
                        <div className="card card-glass" style={{ padding: '3rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💎</div>
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No opportunities mapped</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                Market gaps will populate as JARVIS analyzes competitors and identifies High TAM / Low NPS segments.
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                            {gaps.map((gap, i) => {
                                const prio = PRIORITY_CONFIG[gap.priority] || PRIORITY_CONFIG.medium;
                                return (
                                    <div key={gap.id} className="card card-glass fade-in-up" style={{ padding: '1.25rem', animationDelay: `${i * 40}ms`, borderLeft: `3px solid ${prio.color}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', flex: 1 }}>{gap.opportunity_name}</div>
                                            <span style={{
                                                fontSize: '0.6rem', padding: '0.15rem 0.5rem', borderRadius: 99,
                                                background: prio.bg, color: prio.color,
                                                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                                                flexShrink: 0, marginLeft: '0.5rem',
                                            }}>
                                                {prio.label}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem' }}>
                                            <div>
                                                <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>TAM</div>
                                                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#22c55e' }}>{formatTam(gap.tam_estimate)}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>NPS</div>
                                                <div style={{ fontSize: '1rem', fontWeight: 700, color: (gap.nps_score ?? 0) < 0 ? '#ef4444' : '#f59e0b' }}>
                                                    {gap.nps_score ?? '—'}
                                                </div>
                                            </div>
                                            {gap.segment && (
                                                <div>
                                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Segment</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{gap.segment}</div>
                                                </div>
                                            )}
                                        </div>

                                        {gap.gap_description && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                                                {gap.gap_description}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                            <span style={{
                                                fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: 4,
                                                background: 'rgba(0,212,255,0.08)', color: 'var(--accent-1, #00d4ff)',
                                                fontWeight: 600, textTransform: 'capitalize',
                                            }}>
                                                {gap.status}
                                            </span>
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                                                {new Date(gap.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ Industry Playbooks ═══ */}
            {activeTab === 'playbooks' && (
                <div className="fade-in-up">
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
                        Pre-built sector frameworks. Activate to seed your opportunity matrix.
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                        {playbooks.map((pb, i) => (
                            <div key={pb.id} className="card card-glass fade-in-up" style={{
                                padding: '1.5rem', animationDelay: `${i * 80}ms`,
                                borderTop: '2px solid rgba(0,212,255,0.3)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: 12,
                                        background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                                    }}>
                                        {pb.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{pb.sector}</div>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 600 }}>TAM: {pb.tam}</span>
                                            <span style={{ fontSize: '0.7rem', color: pb.nps < 0 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>NPS: {pb.nps}</span>
                                        </div>
                                    </div>
                                </div>

                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                                    {pb.angle}
                                </p>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1.25rem' }}>
                                    {pb.gaps.map(g => (
                                        <span key={g.opportunity_name} style={{
                                            fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: 6,
                                            background: 'rgba(0,212,255,0.06)', color: 'var(--accent-1, #00d4ff)',
                                            border: '1px solid rgba(0,212,255,0.12)',
                                        }}>
                                            {g.opportunity_name}
                                        </span>
                                    ))}
                                </div>

                                <button
                                    onClick={() => activatePlaybook(pb)}
                                    disabled={activatingPlaybook === pb.id}
                                    style={{
                                        width: '100%', padding: '0.65rem', borderRadius: 10,
                                        background: activatingPlaybook === pb.id ? 'rgba(0,212,255,0.15)' : 'var(--accent-1, #00d4ff)',
                                        color: activatingPlaybook === pb.id ? 'var(--accent-1, #00d4ff)' : '#000',
                                        border: 'none', fontWeight: 700, fontSize: '0.825rem',
                                        cursor: activatingPlaybook === pb.id ? 'wait' : 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {activatingPlaybook === pb.id ? 'Activating...' : `Activate ${pb.gaps.length} Opportunities`}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <ToastContainer />
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    padding: '0.6rem 0.85rem',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontSize: '0.825rem',
    outline: 'none',
};

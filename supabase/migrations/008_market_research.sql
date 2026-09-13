-- ══════════════════════════════════════════════════════════════════
-- JARVIS SaaS — Market Disruption & Research Intelligence
-- Migration 008
-- ══════════════════════════════════════════════════════════════════

-- Competitor tracking entries
CREATE TABLE IF NOT EXISTS public.competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    website_url TEXT,
    social_handles JSONB DEFAULT '{}',
    industry TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitors_user ON public.competitors(user_id);

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own competitors"
    ON public.competitors FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on competitors"
    ON public.competitors FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

-- Pricing change snapshots
CREATE TABLE IF NOT EXISTS public.pricing_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL DEFAULT '',
    price_amount NUMERIC(12,2),
    price_currency TEXT DEFAULT 'USD',
    price_interval TEXT DEFAULT 'month' CHECK (price_interval IN ('month','year','one_time','custom')),
    features JSONB DEFAULT '[]',
    source_url TEXT,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_user ON public.pricing_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_competitor ON public.pricing_snapshots(competitor_id);
CREATE INDEX IF NOT EXISTS idx_pricing_captured ON public.pricing_snapshots(captured_at DESC);

ALTER TABLE public.pricing_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own pricing snapshots"
    ON public.pricing_snapshots FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users insert own pricing snapshots"
    ON public.pricing_snapshots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on pricing"
    ON public.pricing_snapshots FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

-- Market gap matrix entries (TAM/NPS analysis)
CREATE TABLE IF NOT EXISTS public.market_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    opportunity_name TEXT NOT NULL,
    tam_estimate NUMERIC(15,2),
    tam_unit TEXT DEFAULT 'USD',
    nps_score INTEGER CHECK (nps_score >= -100 AND nps_score <= 100),
    segment TEXT DEFAULT '',
    competitor_ids UUID[] DEFAULT '{}',
    gap_description TEXT DEFAULT '',
    strategy_notes TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
    status TEXT DEFAULT 'identified' CHECK (status IN ('identified','validated','pursuing','captured','dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_gaps_user ON public.market_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_market_gaps_priority ON public.market_gaps(priority);
CREATE INDEX IF NOT EXISTS idx_market_gaps_status ON public.market_gaps(status);

ALTER TABLE public.market_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own market gaps"
    ON public.market_gaps FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on market gaps"
    ON public.market_gaps FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

-- Research reports / intelligence snapshots
CREATE TABLE IF NOT EXISTS public.research_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    report_type TEXT DEFAULT 'competitor' CHECK (report_type IN ('competitor','market','pricing','social','counter_strategy')),
    content TEXT DEFAULT '',
    data JSONB DEFAULT '{}',
    source_urls TEXT[] DEFAULT '{}',
    competitor_id UUID REFERENCES public.competitors(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_user ON public.research_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_research_type ON public.research_reports(report_type);

ALTER TABLE public.research_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own research reports"
    ON public.research_reports FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on research reports"
    ON public.research_reports FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

-- Auto-update triggers
CREATE TRIGGER update_competitors_updated_at
    BEFORE UPDATE ON public.competitors
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_market_gaps_updated_at
    BEFORE UPDATE ON public.market_gaps
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

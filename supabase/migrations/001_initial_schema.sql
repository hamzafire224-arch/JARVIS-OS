-- ═══════════════════════════════════════════════════════════════════════════════
-- JARVIS SaaS — Supabase Schema Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable pgvector extension for memory embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. User Profiles (extends Supabase auth.users)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    variant TEXT DEFAULT 'balanced' CHECK (variant IN ('balanced', 'productivity')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, variant)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        'balanced'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Subscriptions (updated by LemonSqueezy webhooks)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    status TEXT DEFAULT 'free' CHECK (status IN ('active', 'free', 'cancelled', 'past_due', 'expired', 'paused')),
    plan TEXT DEFAULT 'balanced' CHECK (plan IN ('balanced', 'productivity', 'enterprise')),
    lemon_subscription_id TEXT UNIQUE,
    lemon_customer_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemon_id ON public.subscriptions(lemon_subscription_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. License Keys
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    license_key TEXT UNIQUE NOT NULL,
    variant TEXT DEFAULT 'balanced' CHECK (variant IN ('balanced', 'productivity')),
    is_active BOOLEAN DEFAULT TRUE,
    last_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON public.licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_key ON public.licenses(license_key);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Memory Vectors (for cloud memory sync)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.memory_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'fact' CHECK (type IN ('preference', 'fact', 'project', 'context', 'feedback')),
    importance INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
    tags TEXT[] DEFAULT '{}',
    embedding VECTOR(1536),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_user_id ON public.memory_vectors(user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Row-Level Security (RLS)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_vectors ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Subscriptions
CREATE POLICY "Users read own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages subscriptions" ON public.subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Licenses
CREATE POLICY "Users read own licenses" ON public.licenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages licenses" ON public.licenses FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Memory vectors
CREATE POLICY "Users read own memories" ON public.memory_vectors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own memories" ON public.memory_vectors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own memories" ON public.memory_vectors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own memories" ON public.memory_vectors FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. Updated_at Auto-Refresh
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_memory_updated_at
    BEFORE UPDATE ON public.memory_vectors
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

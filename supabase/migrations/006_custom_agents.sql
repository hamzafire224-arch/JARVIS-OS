-- JARVIS SaaS — Custom Agents & Marketplace Skills

-- Custom user-created agents
CREATE TABLE IF NOT EXISTS public.custom_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    persona TEXT DEFAULT '',
    system_prompt TEXT DEFAULT '',
    skills TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'idle' CHECK (status IN ('idle','training','active','error')),
    training_progress INTEGER DEFAULT 0 CHECK (training_progress BETWEEN 0 AND 100),
    avatar_emoji TEXT DEFAULT '🤖',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_agents_user ON public.custom_agents(user_id);

ALTER TABLE public.custom_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own agents" ON public.custom_agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own agents" ON public.custom_agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own agents" ON public.custom_agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own agents" ON public.custom_agents FOR DELETE USING (auth.uid() = user_id);

-- Marketplace skills (shared across users)
CREATE TABLE IF NOT EXISTS public.marketplace_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'utility' CHECK (category IN ('utility','productivity','development','communication','data','automation','custom')),
    icon TEXT DEFAULT '⚡',
    version TEXT DEFAULT '1.0.0',
    downloads INTEGER DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 0,
    verified BOOLEAN DEFAULT false,
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_skills_category ON public.marketplace_skills(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_skills_downloads ON public.marketplace_skills(downloads DESC);

ALTER TABLE public.marketplace_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads marketplace skills" ON public.marketplace_skills FOR SELECT USING (true);
CREATE POLICY "Authors manage own skills" ON public.marketplace_skills FOR ALL USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Service role manages marketplace" ON public.marketplace_skills FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_custom_agents_updated_at BEFORE UPDATE ON public.custom_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_marketplace_skills_updated_at BEFORE UPDATE ON public.marketplace_skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

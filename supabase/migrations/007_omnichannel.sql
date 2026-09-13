-- ══════════════════════════════════════════════════════════════════
-- JARVIS SaaS — Omnichannel Messaging & Guardrails
-- Migration 007
-- ══════════════════════════════════════════════════════════════════

-- Omnichannel inbound/outbound messages
CREATE TABLE IF NOT EXISTS public.omnichannel_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp','instagram','telegram','email','sms','web')),
    direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound','outbound')),
    sender_id TEXT NOT NULL DEFAULT '',
    sender_name TEXT DEFAULT '',
    recipient_id TEXT DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    media_url TEXT,
    media_type TEXT,
    platform_message_id TEXT,
    platform_timestamp TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    status TEXT DEFAULT 'received' CHECK (status IN ('received','processing','replied','failed','archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_omnichannel_user ON public.omnichannel_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_channel ON public.omnichannel_messages(channel);
CREATE INDEX IF NOT EXISTS idx_omnichannel_sender ON public.omnichannel_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_status ON public.omnichannel_messages(status);
CREATE INDEX IF NOT EXISTS idx_omnichannel_created ON public.omnichannel_messages(created_at DESC);

ALTER TABLE public.omnichannel_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own messages"
    ON public.omnichannel_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users insert own messages"
    ON public.omnichannel_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own messages"
    ON public.omnichannel_messages FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on messages"
    ON public.omnichannel_messages FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

-- Guardrail permission requests
CREATE TABLE IF NOT EXISTS public.permission_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.custom_agents(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'send_message','delete_data','financial_transaction',
        'api_call','file_write','system_config','escalation','custom'
    )),
    action_summary TEXT NOT NULL DEFAULT '',
    action_payload JSONB DEFAULT '{}',
    risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high','critical')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','expired','auto_approved')),
    decided_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_user ON public.permission_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_status ON public.permission_requests(status);
CREATE INDEX IF NOT EXISTS idx_permission_pending ON public.permission_requests(user_id, status) WHERE status = 'pending';

ALTER TABLE public.permission_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own permission requests"
    ON public.permission_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users update own permission requests"
    ON public.permission_requests FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on permissions"
    ON public.permission_requests FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

-- Auto-update triggers
CREATE TRIGGER update_omnichannel_messages_updated_at
    BEFORE UPDATE ON public.omnichannel_messages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

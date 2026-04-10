-- ═══════════════════════════════════════════════════════════════════════════════
-- JARVIS SaaS — Telemetry Events Table
-- Stores usage data pushed from the CLI for dashboard visualization.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.telemetry_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'session_start', 'session_end', 'task_completed',
        'tool_used', 'model_request', 'memory_update', 'error'
    )),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_user ON public.telemetry_events(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_type ON public.telemetry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_created ON public.telemetry_events(created_at DESC);

-- RLS
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own telemetry" ON public.telemetry_events
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages telemetry" ON public.telemetry_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

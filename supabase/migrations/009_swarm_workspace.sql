-- ══════════════════════════════════════════════════════════════════
-- JARVIS SaaS — Swarm Workspace (Multi-Agent Canvas)
-- Migration 009
-- ══════════════════════════════════════════════════════════════════

-- Swarm workspace canvas state (persisted layouts)
CREATE TABLE IF NOT EXISTS public.swarm_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Default Workspace',
    viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual nodes on the canvas (agents, ingest sources, output sinks)
CREATE TABLE IF NOT EXISTS public.swarm_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.swarm_workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    node_type TEXT NOT NULL CHECK (node_type IN (
        'agent', 'ingest_whatsapp', 'ingest_instagram', 'ingest_web',
        'output_response', 'output_email', 'output_webhook',
        'skill', 'document', 'supervisor'
    )),
    ref_id UUID,
    label TEXT NOT NULL DEFAULT '',
    position_x FLOAT NOT NULL DEFAULT 0,
    position_y FLOAT NOT NULL DEFAULT 0,
    config JSONB DEFAULT '{}',
    status TEXT DEFAULT 'idle' CHECK (status IN ('idle','running','success','error','waiting')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connections between nodes (edges)
CREATE TABLE IF NOT EXISTS public.swarm_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.swarm_workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_node_id UUID NOT NULL REFERENCES public.swarm_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES public.swarm_nodes(id) ON DELETE CASCADE,
    label TEXT DEFAULT '',
    animated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Execution runs (durable state machine log)
CREATE TABLE IF NOT EXISTS public.swarm_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.swarm_workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    inngest_run_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending','running','paused','waiting_approval',
        'completed','failed','cancelled'
    )),
    trigger_event JSONB DEFAULT '{}',
    result JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Execution step log (per-agent execution within a swarm run)
CREATE TABLE IF NOT EXISTS public.swarm_execution_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES public.swarm_executions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    node_id UUID REFERENCES public.swarm_nodes(id) ON DELETE SET NULL,
    agent_name TEXT DEFAULT '',
    step_type TEXT DEFAULT 'task' CHECK (step_type IN (
        'task','recheck','approval','delegation','error','output'
    )),
    input JSONB DEFAULT '{}',
    output JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','skipped')),
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forensic lineage (trace output back to source context)
CREATE TABLE IF NOT EXISTS public.lineage_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_step_id UUID NOT NULL REFERENCES public.swarm_execution_steps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN (
        'vector_memory','scraped_url','document','prompt_constraint',
        'marketplace_skill','user_input','omnichannel_message'
    )),
    source_ref TEXT DEFAULT '',
    source_snippet TEXT DEFAULT '',
    relevance_score FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ Indexes ═══
CREATE INDEX IF NOT EXISTS idx_swarm_workspaces_user ON public.swarm_workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_swarm_nodes_workspace ON public.swarm_nodes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_swarm_nodes_user ON public.swarm_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_swarm_connections_workspace ON public.swarm_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_swarm_executions_workspace ON public.swarm_executions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_swarm_executions_user ON public.swarm_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_swarm_exec_steps_execution ON public.swarm_execution_steps(execution_id);
CREATE INDEX IF NOT EXISTS idx_lineage_step ON public.lineage_entries(execution_step_id);

-- ═══ Row Level Security ═══
ALTER TABLE public.swarm_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swarm_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swarm_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swarm_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swarm_execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineage_entries ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "user_own_swarm_workspaces" ON public.swarm_workspaces
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_own_swarm_nodes" ON public.swarm_nodes
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_own_swarm_connections" ON public.swarm_connections
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_own_swarm_executions" ON public.swarm_executions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_own_swarm_exec_steps" ON public.swarm_execution_steps
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_own_lineage" ON public.lineage_entries
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Service role policies
CREATE POLICY "service_swarm_workspaces" ON public.swarm_workspaces
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_swarm_nodes" ON public.swarm_nodes
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_swarm_connections" ON public.swarm_connections
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_swarm_executions" ON public.swarm_executions
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_swarm_exec_steps" ON public.swarm_execution_steps
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_lineage" ON public.lineage_entries
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══ Supabase Realtime CDC ═══
ALTER PUBLICATION supabase_realtime ADD TABLE public.swarm_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.swarm_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.swarm_execution_steps;

-- ═══ Auto-update triggers ═══
CREATE TRIGGER update_swarm_workspaces_updated_at
    BEFORE UPDATE ON public.swarm_workspaces
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_swarm_nodes_updated_at
    BEFORE UPDATE ON public.swarm_nodes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

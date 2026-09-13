CREATE TABLE IF NOT EXISTS public.market_playbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playbook_id TEXT NOT NULL UNIQUE,
    sector TEXT NOT NULL,
    icon TEXT,
    tam TEXT,
    nps INTEGER,
    angle TEXT,
    gaps JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.market_playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all authenticated users for playbooks" 
    ON public.market_playbooks 
    FOR SELECT 
    TO authenticated 
    USING (true);

INSERT INTO public.market_playbooks (playbook_id, sector, icon, tam, nps, angle, gaps) VALUES
('crm-disruption', 'Enterprise CRM Disruption', '💼', '$80B', -12, 'Salesforce lock-in fatigue creates $80B addressable market for AI-native CRM that auto-enriches contacts, predicts churn, and generates outreach sequences without manual data entry.', '[
    { "opportunity_name": "AI Contact Enrichment", "tam_estimate": 15000000000, "nps_score": -18, "segment": "Enterprise CRM", "gap_description": "Auto-populate CRM fields from email, calendar, and web signals.", "priority": "critical" },
    { "opportunity_name": "Predictive Churn Engine", "tam_estimate": 8000000000, "nps_score": -25, "segment": "SaaS Sales", "gap_description": "ML-driven churn prediction 60 days before cancellation signals appear.", "priority": "high" }
]'::jsonb),
('medical-claims', 'Medical Claims Coding', '🏥', '$12B', -34, 'Medical billing errors cost $935M/year in denied claims. Audio-to-billing pipeline using Whisper STT + GPT coding can reduce denial rates by 40% and cut processing time from 72h to 4h.', '[
    { "opportunity_name": "Audio-to-Billing Pipeline", "tam_estimate": 5000000000, "nps_score": -40, "segment": "Healthcare RCM", "gap_description": "Transcribe physician dictation directly to ICD-10/CPT codes.", "priority": "critical" },
    { "opportunity_name": "Denial Prevention Engine", "tam_estimate": 3000000000, "nps_score": -30, "segment": "Medical Billing", "gap_description": "Pre-submission claim validation against payer rules.", "priority": "high" }
]'::jsonb),
('procurement', 'Procurement Pipeline', '📦', '$6.5B', -8, 'Supply chain negotiation is still 70% manual. AI agent that ingests RFQ templates, benchmarks supplier pricing, and generates counter-proposals can cut procurement cycle time by 55%.', '[
    { "opportunity_name": "RFQ Auto-Negotiator", "tam_estimate": 2500000000, "nps_score": -15, "segment": "Enterprise Procurement", "gap_description": "AI-generated counter-proposals based on historical pricing data.", "priority": "high" },
    { "opportunity_name": "Supplier Risk Scoring", "tam_estimate": 1800000000, "nps_score": -5, "segment": "Supply Chain", "gap_description": "Real-time supplier reliability scoring from financial + delivery data.", "priority": "medium" }
]'::jsonb)
ON CONFLICT (playbook_id) DO NOTHING;

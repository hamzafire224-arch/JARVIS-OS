-- ═══════════════════════════════════════════════════════════════════════════════
-- JARVIS SaaS — Free Launch Mode
-- Removes trial countdown. Everyone who signs up gets full Productivity access.
-- After the 2-month free period, run a separate downgrade migration.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Update existing trial users to active
UPDATE public.subscriptions
SET status = 'active',
    trial_started_at = NULL,
    trial_ends_at = NULL,
    updated_at = NOW()
WHERE status = 'trial';

-- 2. Replace the signup trigger to give active Productivity (no trial timer)
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscriptions (
        user_id,
        status,
        plan,
        current_period_start,
        current_period_end
    ) VALUES (
        NEW.id,
        'active',
        'productivity',
        NOW(),
        NULL  -- No expiry during free launch
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Set profile variant to productivity
    UPDATE public.profiles
    SET variant = 'productivity', updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

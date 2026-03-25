-- ═══════════════════════════════════════════════════════════════════════════════
-- JARVIS SaaS — Trial Period Support
-- Adds trial tracking columns and auto-creates trial subscriptions on signup
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Add trial columns to subscriptions
ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 2. Expand status CHECK to include 'trial'
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_status_check
    CHECK (status IN ('active', 'free', 'cancelled', 'past_due', 'expired', 'paused', 'trial'));

-- 3. Auto-create trial subscription on user signup
--    Every new user gets 60 days of Productivity for free
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscriptions (
        user_id,
        status,
        plan,
        trial_started_at,
        trial_ends_at,
        current_period_start,
        current_period_end
    ) VALUES (
        NEW.id,
        'trial',
        'productivity',
        NOW(),
        NOW() + INTERVAL '60 days',
        NOW(),
        NOW() + INTERVAL '60 days'
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Also set profile variant to productivity during trial
    UPDATE public.profiles
    SET variant = 'productivity', updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

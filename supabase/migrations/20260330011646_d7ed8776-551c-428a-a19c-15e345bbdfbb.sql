-- Fix: make user_id nullable on tables that need SET NULL on delete
-- This must run before the cascade migration can apply on Live

ALTER TABLE public.adaptations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.ai_usage_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.chat_conversations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.hidden_activities ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.pdf_uploads ALTER COLUMN user_id DROP NOT NULL;

-- Fix: drop FK from user_subscriptions to plans before dropping tables
ALTER TABLE IF EXISTS public.user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_plan_id_fkey;
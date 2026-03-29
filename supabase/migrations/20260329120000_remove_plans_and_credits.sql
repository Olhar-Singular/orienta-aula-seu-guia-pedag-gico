-- Remove payment/plan/credit infrastructure (no longer needed)

-- Drop triggers first
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
DROP TRIGGER IF EXISTS on_auth_user_created_assign_plan ON auth.users;

-- Drop trigger functions
DROP FUNCTION IF EXISTS public.assign_free_plan();

-- Drop RPC function
DROP FUNCTION IF EXISTS public.get_credits_used(uuid);

-- Drop tables (order matters due to FK constraints)
DROP TABLE IF EXISTS public.credit_usage;
DROP TABLE IF EXISTS public.user_subscriptions;
DROP TABLE IF EXISTS public.plans;

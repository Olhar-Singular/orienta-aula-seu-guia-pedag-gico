-- =============================================
-- MIGRATION: Apply all pending RBAC changes
-- =============================================

-- 1) Create is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT is_super_admin FROM public.profiles WHERE user_id = _user_id),
    false
  );
$$;

-- 2) Create is_user_active function
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT is_active FROM public.profiles WHERE user_id = _user_id),
    true
  );
$$;

-- 3) Rename role 'admin' to 'gestor' in school_members
UPDATE public.school_members SET role = 'gestor' WHERE role = 'admin';

-- 4) Create is_school_gestor function
CREATE OR REPLACE FUNCTION public.is_school_gestor(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1 FROM public.school_members
    WHERE user_id = _user_id AND school_id = _school_id AND role = 'gestor'
  );
$$;

-- 5) Redefine is_school_admin: gestor OR super-admin
CREATE OR REPLACE FUNCTION public.is_school_admin(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_school_gestor(_user_id, _school_id)
      OR public.is_super_admin(_user_id);
$$;

-- 6) Super-admin RLS policies
CREATE POLICY "super_admin_read_all_schools" ON public.schools
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_update_all_schools" ON public.schools
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_delete_schools" ON public.schools
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_read_all_members" ON public.school_members
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_read_all_ai_logs" ON public.ai_usage_logs
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_read_all_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_update_all_profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 7) Remove payment/plan/credit infrastructure
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
DROP TRIGGER IF EXISTS on_auth_user_created_assign_plan ON auth.users;
DROP FUNCTION IF EXISTS public.assign_free_plan();
DROP FUNCTION IF EXISTS public.get_credits_used(uuid);
DROP TABLE IF EXISTS public.credit_usage;
DROP TABLE IF EXISTS public.user_subscriptions;
DROP TABLE IF EXISTS public.plans;

-- 8) FK cascades for user deletion
ALTER TABLE public.school_members
  DROP CONSTRAINT IF EXISTS school_members_user_id_fkey,
  ADD CONSTRAINT school_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.rate_limits
  DROP CONSTRAINT IF EXISTS rate_limits_user_id_fkey,
  ADD CONSTRAINT rate_limits_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_user_id_fkey,
  ADD CONSTRAINT ai_usage_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_user_id_fkey,
  ADD CONSTRAINT chat_conversations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.hidden_activities
  DROP CONSTRAINT IF EXISTS hidden_activities_user_id_fkey,
  ADD CONSTRAINT hidden_activities_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.pdf_uploads
  DROP CONSTRAINT IF EXISTS pdf_uploads_user_id_fkey,
  ADD CONSTRAINT pdf_uploads_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Fix: adaptations should be SET NULL, not CASCADE
ALTER TABLE public.adaptations
  DROP CONSTRAINT IF EXISTS adaptations_user_id_fkey,
  ADD CONSTRAINT adaptations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
-- =============================================================================
-- Supabase advisors fix — REVOKE EXECUTE em SECURITY DEFINER helpers
-- 2026-05-01
-- =============================================================================
-- Resolve advisors:
--   * anon_security_definer_function_executable (13)
--   * authenticated_security_definer_function_executable (13)
--
-- Funções `is_*` são helpers de RLS chamados de policies (rodam como postgres)
-- ou de edge functions com service_role — nenhuma precisa estar acessível via
-- /rest/v1/rpc para anon/authenticated. Triggers idem.
--
-- Mantemos EXECUTE em:
--   * get_school_id_by_code (chamado em src/pages/Settings.tsx)
--   * get_shared_adaptation (chamado em src/pages/SharedAdaptation.tsx, anon)
-- =============================================================================

-- Helpers usados apenas dentro de RLS policies / edge functions com service role
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_school_member(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_school_admin(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_school_gestor(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_class_owner(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_user_active(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_adaptation_shared(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_user_school_id(uuid) FROM anon, authenticated, public;

-- Triggers (nunca devem ser chamados via REST)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.protect_admin_columns() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_conversation_timestamp() FROM anon, authenticated, public;

-- Funções públicas legítimas mantêm EXECUTE:
--   * public.get_school_id_by_code(text) — usado em Settings.tsx (entrar em escola via código)
--   * public.get_shared_adaptation(text) — usado em SharedAdaptation.tsx (rota pública)
-- Não fazemos REVOKE nelas.

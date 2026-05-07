-- =============================================================================
-- Restaura EXECUTE em helpers RLS revogados pelo fix de advisors anterior.
-- 2026-05-02
-- =============================================================================
-- Contexto:
-- A migration 20260501120100_advisors_revoke_security_definer.sql revogou
-- EXECUTE de funções is_* / get_user_school_id de anon/authenticated/public.
-- Premissa errada: SECURITY DEFINER muda quem executa o corpo da função, mas
-- NÃO dispensa o caller de ter EXECUTE. Como dezenas de RLS policies em
-- school_members, classes, students, adaptations etc. chamam essas funções
-- com role authenticated, qualquer query passou a falhar com:
--   42501: permission denied for function is_school_member
--
-- Esta migration:
--   1. Devolve EXECUTE para authenticated (e anon onde é policy pública)
--   2. Endereça o advisor real (function_search_path_mutable) via SET search_path
--
-- Triggers (handle_new_user, protect_admin_columns, update_conversation_timestamp)
-- continuam REVOKED — eles são invocados pelo próprio Postgres, não via REST.
-- =============================================================================

-- 1. Restaurar EXECUTE
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_school_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_school_admin(uuid, uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_school_gestor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_class_owner(uuid, uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_active(uuid)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_school_id(uuid)     TO authenticated;

-- is_adaptation_shared também é avaliada em policy acessada por anon (rota pública /compartilhado)
GRANT EXECUTE ON FUNCTION public.is_adaptation_shared(uuid)   TO anon, authenticated;

-- 2. Endereçar advisor real (search_path mutável em SECURITY DEFINER)
ALTER FUNCTION public.is_super_admin(uuid)         SET search_path = public, pg_temp;
ALTER FUNCTION public.is_school_member(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_school_admin(uuid, uuid)  SET search_path = public, pg_temp;
ALTER FUNCTION public.is_school_gestor(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_class_owner(uuid, uuid)   SET search_path = public, pg_temp;
ALTER FUNCTION public.is_user_active(uuid)         SET search_path = public, pg_temp;
ALTER FUNCTION public.is_adaptation_shared(uuid)   SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_school_id(uuid)     SET search_path = public, pg_temp;

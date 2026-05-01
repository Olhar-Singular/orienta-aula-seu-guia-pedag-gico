-- =============================================================================
-- Investigação do incidente de signup não autorizado (2026-04-28)
--
-- COMO USAR
--   1. Studio do Supabase remoto > SQL Editor > Cole cada bloco e rode.
--   2. Use o role 'service_role' (default no SQL Editor) — RLS não interfere.
--   3. Se algo aparecer no bloco [3] ou [4], a escalation C2 foi explorada;
--      seguir o bloco [REMEDIATE] no fim deste arquivo.
-- =============================================================================

-- [1] Quaisquer contas com domínio @proton.me ou padrão de pentest
SELECT
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  u.email_confirmed_at,
  u.raw_user_meta_data,
  p.is_super_admin,
  p.is_active,
  p.full_name,
  p.name
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE u.email ILIKE '%@proton.me'
   OR u.email ILIKE '%pentest%'
   OR u.email ILIKE '%security%'
   OR u.email ILIKE '%hacker%'
ORDER BY u.created_at DESC;


-- [2] Contas órfãs (sem school_member) — sinal de signup direto via API REST
-- pulando a edge function admin-manage-teachers.
SELECT
  u.id,
  u.email,
  u.created_at,
  u.email_confirmed_at,
  p.is_super_admin
FROM auth.users u
LEFT JOIN public.school_members m ON m.user_id = u.id
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE m.user_id IS NULL
ORDER BY u.created_at DESC;


-- [3] TODOS os super-admins. Deveria ser apenas a sua conta.
SELECT
  p.user_id,
  p.email,
  p.full_name,
  p.is_super_admin,
  p.is_active,
  u.email          AS auth_email,
  u.created_at     AS auth_created_at,
  u.last_sign_in_at
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE p.is_super_admin = true
ORDER BY u.created_at;


-- [4] Logs recentes de auth (últimas 200 entradas) — procurar emails
-- desconhecidos em sign-ups e em sign-ins.
SELECT
  payload ->> 'action'           AS action,
  payload -> 'actor_username'    AS actor_email,
  payload ->> 'log_type'         AS log_type,
  created_at,
  ip_address
FROM auth.audit_log_entries
ORDER BY created_at DESC
LIMIT 200;


-- [5] Membros de escolas que não têm profile ativo coerente
-- (pode indicar auto-join via RLS C3 antes da remediação).
SELECT
  m.id              AS member_id,
  m.school_id,
  s.name            AS school_name,
  m.user_id,
  u.email,
  m.role,
  m.joined_at,
  p.full_name,
  p.is_active
FROM public.school_members m
LEFT JOIN public.schools s ON s.id = m.school_id
LEFT JOIN auth.users u ON u.id = m.user_id
LEFT JOIN public.profiles p ON p.user_id = m.user_id
ORDER BY m.joined_at DESC;


-- =============================================================================
-- [REMEDIATE] Se encontrar conta @proton.me OU super-admin não autorizado:
-- Substitua <USER_ID> pelo id retornado em [1] ou [3], depois rode.
-- =============================================================================

-- 6.1 — Tirar privilégio super-admin (caso C2 tenha sido explorado)
-- UPDATE public.profiles SET is_super_admin = false, is_active = false
-- WHERE user_id = '<USER_ID>';

-- 6.2 — Revogar todas as sessões ativas do usuário
-- (executar no Studio > Authentication > Users > clicar no usuário > "Sign out user")
-- ou via API:
-- SELECT auth.admin_sign_out_user('<USER_ID>');  -- depende da versão do Auth

-- 6.3 — Apagar a conta de uma vez (cascade derruba profile, school_members,
-- adaptations, etc. via FKs ON DELETE CASCADE)
-- DELETE FROM auth.users WHERE id = '<USER_ID>';

-- =============================================================================
-- Seed: super admin
-- =============================================================================
-- Cria um usuário super admin (acesso global a todas as escolas/professores).
--
-- Email:    admin@admin.com
-- Senha:    123123
-- Role:     super admin (profiles.is_super_admin = true)
--
-- Idempotente: se o usuário já existe, garante que está como super admin
-- (caso o profile tenha sido criado mas a flag não tenha sido ligada).
--
-- NÃO fica no fluxo de migrations — rodar manualmente via:
--   make db-seed-super-admin
-- ou direto via psql:
--   PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
--     -f supabase/scripts/seed_super_admin.sql
--
-- IMPORTANTE: o trigger protect_admin_columns só permite alterar
-- is_super_admin via service_role (= conexão psql direta como postgres).
-- Por isso este seed roda direto no DB e NÃO via PostgREST.
-- =============================================================================

DO $$
DECLARE
  v_user_id uuid;
  v_email   text := 'admin@admin.com';
  v_pass    text := '123123';
  v_name    text := 'Super Admin';
BEGIN
  -- Reaproveita o user se já existir; senão cria do zero.
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_pass, gen_salt('bf')),
      now(),
      now(),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('name', v_name),
      false,  -- auth.users.is_super_admin é flag interna do Auth, NÃO confundir
              -- com public.profiles.is_super_admin (RBAC do app).
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      provider,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      'email',
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      now(),
      now(),
      now()
    );

    RAISE NOTICE '✓ auth.users criado: % (id: %)', v_email, v_user_id;
  ELSE
    RAISE NOTICE '• auth.users já existe: % (id: %)', v_email, v_user_id;
  END IF;

  -- O trigger handle_new_user cria o profile automaticamente com
  -- is_super_admin = false. Promovemos aqui.
  -- Como rodamos como postgres (DDL/seed), o trigger protect_admin_columns
  -- aceita a alteração (current_setting('request.jwt.claims') é vazio,
  -- mas verificamos jwt_role IS DISTINCT FROM 'service_role' — vazio dá true,
  -- então o trigger reverte. Workaround: setar local jwt.claims pra service_role.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('role', 'service_role')::text,
    true
  );

  UPDATE public.profiles
     SET is_super_admin = true,
         is_active      = true,
         name           = COALESCE(NULLIF(name, ''), v_name)
   WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    -- Caso o trigger handle_new_user não tenha rodado por algum motivo
    INSERT INTO public.profiles (user_id, name, is_super_admin, is_active)
    VALUES (v_user_id, v_name, true, true);
  END IF;

  RAISE NOTICE '✓ Super admin pronto: %', v_email;
  RAISE NOTICE '  Senha: %', v_pass;
  RAISE NOTICE '  user_id: %', v_user_id;
END $$;

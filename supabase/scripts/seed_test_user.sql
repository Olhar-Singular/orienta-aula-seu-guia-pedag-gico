-- =============================================================================
-- Seed: usuários de teste (professor + super admin)
-- =============================================================================
-- Cria os usuários padrão para testes locais:
--
--   1) Professor       → teste@teste.com / 123123 (role default em profiles)
--   2) Super Admin     → admin@admin.com / 123123 (profiles.is_super_admin = true)
--
-- Idempotente: se o usuário já existe, mantém. No caso do super admin,
-- garante que a flag is_super_admin esteja ligada mesmo que o profile já
-- tenha sido criado.
--
-- NÃO fica no fluxo de migrations — rodar manualmente via
-- `make db-seed-test-user`. Não roda em `supabase db reset`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Professor
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_user_id uuid;
  v_email   text := 'teste@teste.com';
  v_pass    text := '123123';
  v_name    text := 'Professor Teste';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE '• Professor já existe: % (id: %)', v_email, v_user_id;
    RETURN;
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated', v_email,
    crypt(v_pass, gen_salt('bf')),
    now(), now(), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('name', v_name),
    false, '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_user_id::text, 'email',
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    now(), now(), now()
  );

  RAISE NOTICE '✓ Professor criado: % (senha: %, id: %)', v_email, v_pass, v_user_id;
END $$;

-- -----------------------------------------------------------------------------
-- 2) Super Admin
-- -----------------------------------------------------------------------------
-- O trigger protect_admin_columns reverte UPDATEs em is_super_admin quando
-- o caller não é service_role. Setamos request.jwt.claims local pra simular
-- service_role e liberar o UPDATE.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_user_id uuid;
  v_email   text := 'admin@admin.com';
  v_pass    text := '123123';
  v_name    text := 'Super Admin';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated', v_email,
      crypt(v_pass, gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('name', v_name),
      false, '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, v_user_id::text, 'email',
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      now(), now(), now()
    );

    RAISE NOTICE '✓ Super admin criado em auth.users: % (id: %)', v_email, v_user_id;
  ELSE
    RAISE NOTICE '• Super admin já existe em auth.users: % (id: %)', v_email, v_user_id;
  END IF;

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
    INSERT INTO public.profiles (user_id, name, is_super_admin, is_active)
    VALUES (v_user_id, v_name, true, true);
  END IF;

  RAISE NOTICE '✓ Super admin promovido: % (senha: %)', v_email, v_pass;
END $$;

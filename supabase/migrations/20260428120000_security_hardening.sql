-- =============================================================================
-- Security hardening — 2026-04-28
-- Fecha vetores explorados/exploráveis identificados na revisão de segurança:
--   C2 — privilege escalation via UPDATE em profiles.is_super_admin
--   C3 — qualquer authenticated cria escola e auto-junta-se em qualquer escola
--   M2 — handle_new_user nunca deve confiar em raw_user_meta_data para privilégios
-- =============================================================================

-- -----------------------------------------------------------------------------
-- C2: Trigger que protege colunas privilegiadas em public.profiles
-- Regras:
--   * UPDATEs vindos de service_role (edge functions com chave de serviço)
--     podem alterar qualquer coluna.
--   * UPDATEs vindos do PostgREST autenticado (role 'authenticated') NUNCA
--     podem alterar is_super_admin nem is_active. Se tentarem, o trigger
--     reverte silenciosamente para o valor atual.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_admin_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  -- Quando o trigger é disparado por um JWT do PostgREST, o claim 'role'
  -- contém o role do banco que está executando ('authenticated' / 'anon' /
  -- 'service_role'). Em chamadas internas via supabase.auth.admin (service
  -- role key) o claim será 'service_role' e liberamos as mudanças.
  jwt_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';

  IF jwt_role IS DISTINCT FROM 'service_role' THEN
    NEW.is_super_admin := OLD.is_super_admin;
    NEW.is_active      := OLD.is_active;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_admin_columns ON public.profiles;
CREATE TRIGGER trg_protect_admin_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_admin_columns();

-- Endurece a policy de UPDATE em profiles com WITH CHECK explícito também,
-- para que tentativas de mudar user_id/id falhem antes do trigger.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- C3: Membership e criação de escolas só via service_role (edge functions
-- admin-manage-schools / admin-manage-teachers). Usuário comum não pode
-- mais criar escola nem se auto-incluir como membro de qualquer escola.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "school_create" ON public.schools;
CREATE POLICY "school_create_super_admin_only"
  ON public.schools
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "member_join" ON public.school_members;
DROP POLICY IF EXISTS "member_leave" ON public.school_members;

-- (sem replacement: INSERT/DELETE em school_members agora exige service_role)

-- -----------------------------------------------------------------------------
-- M2: handle_new_user passa a ignorar qualquer chave privilegiada que possa
-- ser injetada via raw_user_meta_data (controlado pelo cliente em signUp).
-- Mantém o comportamento atual de copiar apenas o 'name'.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, is_super_admin, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    false,  -- nunca herdar de metadata
    true
  );
  RETURN NEW;
END;
$$;

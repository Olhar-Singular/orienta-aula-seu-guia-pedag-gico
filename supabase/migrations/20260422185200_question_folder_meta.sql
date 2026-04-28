-- Tabelas de metadata para pastas de questões + função RPC de agregação.

-- ============================================================================
-- question_folder_prefs
-- Ordem customizada de pastas por usuário (drag-and-drop persistido).
-- folder_key = "grade:<name>" ou "subject:<grade>/<name>"
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.question_folder_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_key text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, folder_key)
);

CREATE INDEX IF NOT EXISTS question_folder_prefs_user_idx
  ON public.question_folder_prefs (user_id);

ALTER TABLE public.question_folder_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "question_folder_prefs_owner" ON public.question_folder_prefs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- question_empty_folders
-- Pastas de série/matéria criadas manualmente antes de ter questões.
-- Escopo por escola (+ criador para auditoria).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.question_empty_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grade text,
  subject text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, grade, subject)
);

CREATE INDEX IF NOT EXISTS question_empty_folders_school_idx
  ON public.question_empty_folders (school_id);

ALTER TABLE public.question_empty_folders ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão de question_bank: membros da escola + owner
CREATE POLICY "empty_folders_school_or_own" ON public.question_empty_folders
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR (school_id IS NOT NULL AND public.is_school_member(auth.uid(), school_id))
  )
  WITH CHECK (
    created_by = auth.uid()
    OR (school_id IS NOT NULL AND public.is_school_member(auth.uid(), school_id))
  );

-- ============================================================================
-- get_question_folders
-- Agrega question_bank por grade (nível raiz) ou subject (dentro de uma grade).
-- SECURITY INVOKER → RLS do question_bank aplica automaticamente.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_question_folders(
  p_level text,
  p_grade text DEFAULT NULL
)
RETURNS TABLE (folder_key text, folder_count bigint, last_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p_level = 'grade' THEN grade
      WHEN p_level = 'subject' THEN subject
    END AS folder_key,
    COUNT(*)::bigint AS folder_count,
    MAX(created_at) AS last_at
  FROM public.question_bank
  WHERE
    (p_level = 'grade')
    OR (p_level = 'subject' AND grade IS NOT DISTINCT FROM p_grade)
  GROUP BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_question_folders(text, text) TO authenticated;

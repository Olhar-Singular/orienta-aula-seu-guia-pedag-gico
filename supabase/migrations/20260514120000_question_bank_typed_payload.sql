-- Adiciona suporte a questões tipadas (V/F, lacunas, matching, etc.) no banco de questões.
-- Linhas existentes ficam com type=NULL e são inferidas pelo client via inferLegacyType()
-- (type=NULL && options !== null → multiple_choice; senão open_ended).
-- Não há backfill: a coluna payload é NULL para os tipos legados (multiple_choice/open_ended
-- continuam usando options + correct_answer diretamente).

ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS type text NULL,
  ADD COLUMN IF NOT EXISTS payload jsonb NULL;

-- Constraint de valores válidos. Permite NULL para retrocompat.
ALTER TABLE public.question_bank
  DROP CONSTRAINT IF EXISTS question_bank_type_check;

ALTER TABLE public.question_bank
  ADD CONSTRAINT question_bank_type_check
  CHECK (
    type IS NULL OR type IN (
      'multiple_choice',
      'multiple_answer',
      'open_ended',
      'fill_blank',
      'true_false',
      'matching',
      'ordering',
      'table'
    )
  );

-- Índice parcial: só linhas que já declaram tipo. Mantém o filtro útil sem custo nas legadas.
CREATE INDEX IF NOT EXISTS question_bank_type_idx
  ON public.question_bank (type)
  WHERE type IS NOT NULL;

COMMENT ON COLUMN public.question_bank.type IS
  'Tipo discriminado da questão. NULL = legado (inferido pelo client via inferLegacyType).';

COMMENT ON COLUMN public.question_bank.payload IS
  'Estrutura tipada da questão (tf_items, blank_placeholder, match_pairs, etc.). NULL para multiple_choice/open_ended legados que continuam usando options + correct_answer.';

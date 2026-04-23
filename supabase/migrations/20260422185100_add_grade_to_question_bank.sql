-- Adiciona coluna `grade` (série) ao banco de questões.
-- TEXT nullable, sem CHECK — a validação é client-side via src/lib/grades.ts.
-- Valores existentes ficam NULL e aparecerão em "Sem classificação" na UI.
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS grade TEXT;

-- Índice para acelerar GROUP BY em get_question_folders.
CREATE INDEX IF NOT EXISTS question_bank_grade_subject_idx
  ON public.question_bank (grade, subject);

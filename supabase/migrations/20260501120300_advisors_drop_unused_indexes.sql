-- =============================================================================
-- Supabase advisors fix — Drop indexes não usados (parcial)
-- 2026-05-01
-- =============================================================================
-- Resolve advisor: unused_index (5 de 11)
--
-- Dos 11 índices reportados como "unused", 6 cobrem foreign keys e dropá-los
-- re-introduziria o advisor `unindexed_foreign_keys` (cascade DELETE no parent
-- viraria full scan). Mantemos esses 6 e dropamos só os 5 que NÃO cobrem FK:
--
--   * idx_ai_usage_logs_created_at  → coluna created_at (não FK)
--   * idx_ai_usage_logs_model       → coluna model (não FK)
--   * idx_ai_usage_logs_period      → composto created_at/model/action_type (não FK)
--   * idx_ai_usage_logs_cost        → coluna cost_total (não FK)
--   * question_bank_grade_subject_idx → composto grade/subject (não FK)
--
-- Mantidos (cobrem FKs school_id, dropá-los geraria WARN de FK descoberta):
--   * idx_classes_school_id
--   * idx_adaptations_history_school_id
--   * idx_adaptations_school_id
--   * idx_pdf_uploads_school_id
--   * idx_ai_usage_logs_school_id
--   * question_empty_folders_school_idx
-- =============================================================================

DROP INDEX IF EXISTS public.idx_ai_usage_logs_created_at;
DROP INDEX IF EXISTS public.idx_ai_usage_logs_model;
DROP INDEX IF EXISTS public.idx_ai_usage_logs_period;
DROP INDEX IF EXISTS public.idx_ai_usage_logs_cost;
DROP INDEX IF EXISTS public.question_bank_grade_subject_idx;

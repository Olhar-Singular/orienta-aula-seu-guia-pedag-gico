-- =============================================================================
-- Supabase advisors fix — Indexes em foreign keys sem cobertura
-- 2026-05-01
-- =============================================================================
-- Resolve advisor: unindexed_foreign_keys (12)
-- Sem índice de cobertura, DELETE/UPDATE no parent vira full scan no child.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_adaptations_user_id
  ON public.adaptations (user_id);

CREATE INDEX IF NOT EXISTS idx_adaptations_history_class_id
  ON public.adaptations_history (class_id);

CREATE INDEX IF NOT EXISTS idx_adaptations_history_student_id
  ON public.adaptations_history (student_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id
  ON public.chat_conversations (user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id
  ON public.chat_messages (conversation_id);

CREATE INDEX IF NOT EXISTS idx_class_students_class_id
  ON public.class_students (class_id);

CREATE INDEX IF NOT EXISTS idx_pdf_uploads_user_id
  ON public.pdf_uploads (user_id);

CREATE INDEX IF NOT EXISTS idx_question_bank_school_id
  ON public.question_bank (school_id);

CREATE INDEX IF NOT EXISTS idx_question_empty_folders_created_by
  ON public.question_empty_folders (created_by);

CREATE INDEX IF NOT EXISTS idx_school_members_user_id
  ON public.school_members (user_id);

CREATE INDEX IF NOT EXISTS idx_shared_adaptations_adaptation_id
  ON public.shared_adaptations (adaptation_id);

CREATE INDEX IF NOT EXISTS idx_student_files_student_id
  ON public.student_files (student_id);

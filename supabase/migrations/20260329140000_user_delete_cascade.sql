-- When a user is deleted:
--   CASCADE: identity/access data (profiles, school_members, rate_limits)
--   SET NULL: content data (adaptations, ai_usage_logs, chat_conversations, hidden_activities, pdf_uploads)

-- ── profiles: already has FK, recreate with CASCADE ──
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_user_id_fkey,
  ADD CONSTRAINT profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── school_members ──
ALTER TABLE school_members
  DROP CONSTRAINT IF EXISTS school_members_user_id_fkey,
  ADD CONSTRAINT school_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── rate_limits ──
ALTER TABLE rate_limits
  DROP CONSTRAINT IF EXISTS rate_limits_user_id_fkey,
  ADD CONSTRAINT rate_limits_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── adaptations: preserve content, just unlink ──
ALTER TABLE adaptations
  DROP CONSTRAINT IF EXISTS adaptations_user_id_fkey,
  ADD CONSTRAINT adaptations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── ai_usage_logs ──
ALTER TABLE ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_user_id_fkey,
  ADD CONSTRAINT ai_usage_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── chat_conversations ──
ALTER TABLE chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_user_id_fkey,
  ADD CONSTRAINT chat_conversations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── hidden_activities ──
ALTER TABLE hidden_activities
  DROP CONSTRAINT IF EXISTS hidden_activities_user_id_fkey,
  ADD CONSTRAINT hidden_activities_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── pdf_uploads ──
ALTER TABLE pdf_uploads
  DROP CONSTRAINT IF EXISTS pdf_uploads_user_id_fkey,
  ADD CONSTRAINT pdf_uploads_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- =============================================================================
-- Supabase advisors fix — RLS consolidation + auth.uid() initplan
-- 2026-05-01
-- =============================================================================
-- Resolve dois grupos de advisors performance:
--   * auth_rls_initplan (34 policies): troca auth.uid() por (select auth.uid())
--     para que o planner avalie uma vez por query, não por linha.
--   * multiple_permissive_policies (8 grupos): consolida policies duplicadas
--     em (role, action) usando OR.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles: SELECT (own/school/super) + UPDATE (own/super) consolidadas
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "school_members_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "super_admin_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "super_admin_update_all_profiles" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR is_super_admin((select auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.school_members sm1
      JOIN public.school_members sm2 ON sm1.school_id = sm2.school_id
      WHERE sm1.user_id = (select auth.uid())
        AND sm2.user_id = profiles.user_id
    )
  );

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR is_super_admin((select auth.uid()))
  )
  WITH CHECK (
    (select auth.uid()) = user_id
    OR is_super_admin((select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- rate_limits: SELECT/INSERT/UPDATE com (select auth.uid())
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can insert their own rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can update their own rate limits" ON public.rate_limits;

CREATE POLICY "rate_limits_select" ON public.rate_limits
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "rate_limits_insert" ON public.rate_limits
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "rate_limits_update" ON public.rate_limits
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- chat_conversations / chat_messages / hidden_activities: ALL próprio
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own conversations" ON public.chat_conversations;
CREATE POLICY "chat_conversations_owner" ON public.chat_conversations
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users manage own messages" ON public.chat_messages;
CREATE POLICY "chat_messages_owner" ON public.chat_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND c.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND c.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "users_manage_own_hidden" ON public.hidden_activities;
CREATE POLICY "users_manage_own_hidden" ON public.hidden_activities
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- classes / class_students / student_barriers / student_pei / student_files
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "school_or_own_classes" ON public.classes;
CREATE POLICY "school_or_own_classes" ON public.classes
  FOR ALL TO authenticated
  USING (
    (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
    OR (school_id IS NULL AND teacher_id = (select auth.uid()))
  )
  WITH CHECK (
    (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
    OR (school_id IS NULL AND teacher_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "school_or_own_students" ON public.class_students;
CREATE POLICY "school_or_own_students" ON public.class_students
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_students.class_id
        AND (
          (c.school_id IS NOT NULL AND is_school_member((select auth.uid()), c.school_id))
          OR (c.school_id IS NULL AND c.teacher_id = (select auth.uid()))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_students.class_id
        AND (
          (c.school_id IS NOT NULL AND is_school_member((select auth.uid()), c.school_id))
          OR (c.school_id IS NULL AND c.teacher_id = (select auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS "school_or_own_barriers" ON public.student_barriers;
CREATE POLICY "school_or_own_barriers" ON public.student_barriers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.id = student_barriers.student_id
        AND (
          (c.school_id IS NOT NULL AND is_school_member((select auth.uid()), c.school_id))
          OR (c.school_id IS NULL AND c.teacher_id = (select auth.uid()))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.id = student_barriers.student_id
        AND (
          (c.school_id IS NOT NULL AND is_school_member((select auth.uid()), c.school_id))
          OR (c.school_id IS NULL AND c.teacher_id = (select auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS "school_or_own_pei" ON public.student_pei;
CREATE POLICY "school_or_own_pei" ON public.student_pei
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.id = student_pei.student_id
        AND (
          (c.school_id IS NOT NULL AND is_school_member((select auth.uid()), c.school_id))
          OR (c.school_id IS NULL AND c.teacher_id = (select auth.uid()))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.id = student_pei.student_id
        AND (
          (c.school_id IS NOT NULL AND is_school_member((select auth.uid()), c.school_id))
          OR (c.school_id IS NULL AND c.teacher_id = (select auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS "school_or_own_files" ON public.student_files;
CREATE POLICY "school_or_own_files" ON public.student_files
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.id = student_files.student_id
        AND (
          (c.school_id IS NOT NULL AND is_school_member((select auth.uid()), c.school_id))
          OR (c.school_id IS NULL AND c.teacher_id = (select auth.uid()))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.id = student_files.student_id
        AND (
          (c.school_id IS NOT NULL AND is_school_member((select auth.uid()), c.school_id))
          OR (c.school_id IS NULL AND c.teacher_id = (select auth.uid()))
        )
    )
  );

-- -----------------------------------------------------------------------------
-- adaptations: school_or_own
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "school_or_own_adaptations" ON public.adaptations;
CREATE POLICY "school_or_own_adaptations" ON public.adaptations
  FOR ALL TO authenticated
  USING (
    (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
    OR (school_id IS NULL AND user_id = (select auth.uid()))
  )
  WITH CHECK (
    (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
    OR (school_id IS NULL AND user_id = (select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- adaptations_history: SELECT consolidado (shared OR school_or_own) +
-- INSERT/UPDATE/DELETE só school_or_own
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "school_or_own_history" ON public.adaptations_history;
DROP POLICY IF EXISTS "public_read_shared_adaptations" ON public.adaptations_history;

CREATE POLICY "adaptations_history_select" ON public.adaptations_history
  FOR SELECT TO anon, authenticated
  USING (
    is_adaptation_shared(id)
    OR (
      (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
      OR (school_id IS NULL AND teacher_id = (select auth.uid()))
    )
  );

CREATE POLICY "adaptations_history_insert" ON public.adaptations_history
  FOR INSERT TO authenticated
  WITH CHECK (
    (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
    OR (school_id IS NULL AND teacher_id = (select auth.uid()))
  );

CREATE POLICY "adaptations_history_update" ON public.adaptations_history
  FOR UPDATE TO authenticated
  USING (
    (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
    OR (school_id IS NULL AND teacher_id = (select auth.uid()))
  )
  WITH CHECK (
    (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
    OR (school_id IS NULL AND teacher_id = (select auth.uid()))
  );

CREATE POLICY "adaptations_history_delete" ON public.adaptations_history
  FOR DELETE TO authenticated
  USING (
    (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
    OR (school_id IS NULL AND teacher_id = (select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- shared_adaptations
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "school_or_own_shared" ON public.shared_adaptations;
CREATE POLICY "school_or_own_shared" ON public.shared_adaptations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.adaptations_history ah
      WHERE ah.id = shared_adaptations.adaptation_id
        AND (
          (ah.school_id IS NOT NULL AND is_school_member((select auth.uid()), ah.school_id))
          OR (ah.school_id IS NULL AND ah.teacher_id = (select auth.uid()))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.adaptations_history ah
      WHERE ah.id = shared_adaptations.adaptation_id
        AND (
          (ah.school_id IS NOT NULL AND is_school_member((select auth.uid()), ah.school_id))
          OR (ah.school_id IS NULL AND ah.teacher_id = (select auth.uid()))
        )
    )
  );

-- -----------------------------------------------------------------------------
-- pdf_uploads
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "school_or_own_uploads" ON public.pdf_uploads;
CREATE POLICY "school_or_own_uploads" ON public.pdf_uploads
  FOR ALL TO authenticated
  USING (
    (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
    OR (school_id IS NULL AND user_id = (select auth.uid()))
  )
  WITH CHECK (
    (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
    OR (school_id IS NULL AND user_id = (select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- question_bank: SELECT consolidado (public OR school_or_own) +
-- INSERT/UPDATE/DELETE só school_or_own
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "public_questions_read" ON public.question_bank;
DROP POLICY IF EXISTS "school_or_own_questions" ON public.question_bank;

CREATE POLICY "question_bank_select" ON public.question_bank
  FOR SELECT TO authenticated
  USING (
    is_public = true
    OR (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
    OR (school_id IS NULL AND created_by = (select auth.uid()))
  );

CREATE POLICY "question_bank_insert" ON public.question_bank
  FOR INSERT TO authenticated
  WITH CHECK (
    (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
    OR (school_id IS NULL AND created_by = (select auth.uid()))
  );

CREATE POLICY "question_bank_update" ON public.question_bank
  FOR UPDATE TO authenticated
  USING (
    (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
    OR (school_id IS NULL AND created_by = (select auth.uid()))
  )
  WITH CHECK (
    (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
    OR (school_id IS NULL AND created_by = (select auth.uid()))
  );

CREATE POLICY "question_bank_delete" ON public.question_bank
  FOR DELETE TO authenticated
  USING (
    (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
    OR (school_id IS NULL AND created_by = (select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- question_empty_folders / question_folder_prefs
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "empty_folders_school_or_own" ON public.question_empty_folders;
CREATE POLICY "empty_folders_school_or_own" ON public.question_empty_folders
  FOR ALL TO authenticated
  USING (
    created_by = (select auth.uid())
    OR (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
  )
  WITH CHECK (
    created_by = (select auth.uid())
    OR (school_id IS NOT NULL AND is_school_member((select auth.uid()), school_id))
  );

DROP POLICY IF EXISTS "question_folder_prefs_owner" ON public.question_folder_prefs;
CREATE POLICY "question_folder_prefs_owner" ON public.question_folder_prefs
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- ai_usage_logs: SELECT consolidado (admin_da_escola OR super_admin)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "admins_read_school_ai_usage" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "super_admin_read_all_ai_logs" ON public.ai_usage_logs;

CREATE POLICY "ai_usage_logs_select" ON public.ai_usage_logs
  FOR SELECT TO authenticated
  USING (
    is_super_admin((select auth.uid()))
    OR (school_id IS NOT NULL AND is_school_admin((select auth.uid()), school_id))
  );

-- -----------------------------------------------------------------------------
-- school_members: SELECT consolidado (member OR super_admin)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "member_read" ON public.school_members;
DROP POLICY IF EXISTS "super_admin_read_all_members" ON public.school_members;

CREATE POLICY "school_members_select" ON public.school_members
  FOR SELECT TO authenticated
  USING (
    is_school_member((select auth.uid()), school_id)
    OR is_super_admin((select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- schools: SELECT consolidado (member OR super_admin) +
-- UPDATE consolidado (school_admin OR super_admin) +
-- DELETE/INSERT mantidos (apenas super_admin) com (select auth.uid())
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "school_member_read" ON public.schools;
DROP POLICY IF EXISTS "super_admin_read_all_schools" ON public.schools;
DROP POLICY IF EXISTS "school_admin_update" ON public.schools;
DROP POLICY IF EXISTS "super_admin_update_all_schools" ON public.schools;
DROP POLICY IF EXISTS "super_admin_delete_schools" ON public.schools;
DROP POLICY IF EXISTS "school_create_super_admin_only" ON public.schools;

CREATE POLICY "schools_select" ON public.schools
  FOR SELECT TO authenticated
  USING (
    is_school_member((select auth.uid()), id)
    OR is_super_admin((select auth.uid()))
  );

CREATE POLICY "schools_update" ON public.schools
  FOR UPDATE TO authenticated
  USING (
    is_school_admin((select auth.uid()), id)
    OR is_super_admin((select auth.uid()))
  );

CREATE POLICY "schools_delete" ON public.schools
  FOR DELETE TO authenticated
  USING (is_super_admin((select auth.uid())));

CREATE POLICY "schools_insert" ON public.schools
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin((select auth.uid())));

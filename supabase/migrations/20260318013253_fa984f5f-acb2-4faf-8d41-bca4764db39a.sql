
-- 1. Helper function: get user's school_id
CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id
  FROM public.school_members
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 2. Add school_id columns (nullable for users not in a school)
ALTER TABLE public.classes
ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.adaptations_history
ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.pdf_uploads
ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.adaptations
ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

-- 3. Migrate existing data
UPDATE public.classes c
SET school_id = (SELECT school_id FROM public.school_members sm WHERE sm.user_id = c.teacher_id LIMIT 1);

UPDATE public.adaptations_history ah
SET school_id = (SELECT school_id FROM public.school_members sm WHERE sm.user_id = ah.teacher_id LIMIT 1);

UPDATE public.pdf_uploads pu
SET school_id = (SELECT school_id FROM public.school_members sm WHERE sm.user_id = pu.user_id LIMIT 1);

UPDATE public.adaptations a
SET school_id = (SELECT school_id FROM public.school_members sm WHERE sm.user_id = a.user_id LIMIT 1);

-- 4. Create indexes
CREATE INDEX idx_classes_school_id ON public.classes(school_id);
CREATE INDEX idx_adaptations_history_school_id ON public.adaptations_history(school_id);
CREATE INDEX idx_pdf_uploads_school_id ON public.pdf_uploads(school_id);
CREATE INDEX idx_adaptations_school_id ON public.adaptations(school_id);

-- 5. Drop old RLS policies
DROP POLICY IF EXISTS "teacher_own_classes" ON public.classes;
DROP POLICY IF EXISTS "teacher_own_students" ON public.class_students;
DROP POLICY IF EXISTS "teacher_own_barriers" ON public.student_barriers;
DROP POLICY IF EXISTS "teacher_own_pei" ON public.student_pei;
DROP POLICY IF EXISTS "teacher_own_student_files" ON public.student_files;
DROP POLICY IF EXISTS "teacher_own_adaptations_history" ON public.adaptations_history;
DROP POLICY IF EXISTS "question_bank_owner" ON public.question_bank;
DROP POLICY IF EXISTS "question_bank_school_read" ON public.question_bank;
DROP POLICY IF EXISTS "owner_manage_pdf_uploads" ON public.pdf_uploads;
DROP POLICY IF EXISTS "Users can delete their own adaptations" ON public.adaptations;
DROP POLICY IF EXISTS "Users can insert their own adaptations" ON public.adaptations;
DROP POLICY IF EXISTS "Users can update their own adaptations" ON public.adaptations;
DROP POLICY IF EXISTS "Users can view their own adaptations" ON public.adaptations;
DROP POLICY IF EXISTS "owner_manage_shared" ON public.shared_adaptations;

-- 6. New RLS policies: school-based OR personal fallback

-- classes: school members OR own if no school
CREATE POLICY "school_or_own_classes" ON public.classes
  FOR ALL TO authenticated
  USING (
    (school_id IS NOT NULL AND public.is_school_member(auth.uid(), school_id))
    OR (school_id IS NULL AND teacher_id = auth.uid())
  )
  WITH CHECK (
    (school_id IS NOT NULL AND public.is_school_member(auth.uid(), school_id))
    OR (school_id IS NULL AND teacher_id = auth.uid())
  );

-- class_students: via classes
CREATE POLICY "school_or_own_students" ON public.class_students
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c WHERE c.id = class_students.class_id
      AND (
        (c.school_id IS NOT NULL AND public.is_school_member(auth.uid(), c.school_id))
        OR (c.school_id IS NULL AND c.teacher_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes c WHERE c.id = class_students.class_id
      AND (
        (c.school_id IS NOT NULL AND public.is_school_member(auth.uid(), c.school_id))
        OR (c.school_id IS NULL AND c.teacher_id = auth.uid())
      )
    )
  );

-- student_barriers: via class_students -> classes
CREATE POLICY "school_or_own_barriers" ON public.student_barriers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.id = student_barriers.student_id
      AND (
        (c.school_id IS NOT NULL AND public.is_school_member(auth.uid(), c.school_id))
        OR (c.school_id IS NULL AND c.teacher_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.id = student_barriers.student_id
      AND (
        (c.school_id IS NOT NULL AND public.is_school_member(auth.uid(), c.school_id))
        OR (c.school_id IS NULL AND c.teacher_id = auth.uid())
      )
    )
  );

-- student_pei: via class_students -> classes
CREATE POLICY "school_or_own_pei" ON public.student_pei
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.id = student_pei.student_id
      AND (
        (c.school_id IS NOT NULL AND public.is_school_member(auth.uid(), c.school_id))
        OR (c.school_id IS NULL AND c.teacher_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.id = student_pei.student_id
      AND (
        (c.school_id IS NOT NULL AND public.is_school_member(auth.uid(), c.school_id))
        OR (c.school_id IS NULL AND c.teacher_id = auth.uid())
      )
    )
  );

-- student_files: via class_students -> classes
CREATE POLICY "school_or_own_files" ON public.student_files
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.id = student_files.student_id
      AND (
        (c.school_id IS NOT NULL AND public.is_school_member(auth.uid(), c.school_id))
        OR (c.school_id IS NULL AND c.teacher_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.id = student_files.student_id
      AND (
        (c.school_id IS NOT NULL AND public.is_school_member(auth.uid(), c.school_id))
        OR (c.school_id IS NULL AND c.teacher_id = auth.uid())
      )
    )
  );

-- adaptations_history: school OR own
CREATE POLICY "school_or_own_history" ON public.adaptations_history
  FOR ALL TO authenticated
  USING (
    (school_id IS NOT NULL AND public.is_school_member(auth.uid(), school_id))
    OR (school_id IS NULL AND teacher_id = auth.uid())
  )
  WITH CHECK (
    (school_id IS NOT NULL AND public.is_school_member(auth.uid(), school_id))
    OR (school_id IS NULL AND teacher_id = auth.uid())
  );

-- Keep public_read_shared_adaptations (it wasn't dropped)

-- question_bank: school members for school questions, own for personal
CREATE POLICY "school_or_own_questions" ON public.question_bank
  FOR ALL TO authenticated
  USING (
    (school_id IS NOT NULL AND public.is_school_member(auth.uid(), school_id))
    OR (school_id IS NULL AND created_by = auth.uid())
  )
  WITH CHECK (
    (school_id IS NOT NULL AND public.is_school_member(auth.uid(), school_id))
    OR (school_id IS NULL AND created_by = auth.uid())
  );

-- Public questions readable by all authenticated
CREATE POLICY "public_questions_read" ON public.question_bank
  FOR SELECT TO authenticated
  USING (is_public = true);

-- pdf_uploads: school OR own
CREATE POLICY "school_or_own_uploads" ON public.pdf_uploads
  FOR ALL TO authenticated
  USING (
    (school_id IS NOT NULL AND public.is_school_member(auth.uid(), school_id))
    OR (school_id IS NULL AND user_id = auth.uid())
  )
  WITH CHECK (
    (school_id IS NOT NULL AND public.is_school_member(auth.uid(), school_id))
    OR (school_id IS NULL AND user_id = auth.uid())
  );

-- adaptations: school OR own
CREATE POLICY "school_or_own_adaptations" ON public.adaptations
  FOR ALL TO authenticated
  USING (
    (school_id IS NOT NULL AND public.is_school_member(auth.uid(), school_id))
    OR (school_id IS NULL AND user_id = auth.uid())
  )
  WITH CHECK (
    (school_id IS NOT NULL AND public.is_school_member(auth.uid(), school_id))
    OR (school_id IS NULL AND user_id = auth.uid())
  );

-- shared_adaptations: via adaptations_history
CREATE POLICY "school_or_own_shared" ON public.shared_adaptations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.adaptations_history ah
      WHERE ah.id = shared_adaptations.adaptation_id
      AND (
        (ah.school_id IS NOT NULL AND public.is_school_member(auth.uid(), ah.school_id))
        OR (ah.school_id IS NULL AND ah.teacher_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.adaptations_history ah
      WHERE ah.id = shared_adaptations.adaptation_id
      AND (
        (ah.school_id IS NOT NULL AND public.is_school_member(auth.uid(), ah.school_id))
        OR (ah.school_id IS NULL AND ah.teacher_id = auth.uid())
      )
    )
  );

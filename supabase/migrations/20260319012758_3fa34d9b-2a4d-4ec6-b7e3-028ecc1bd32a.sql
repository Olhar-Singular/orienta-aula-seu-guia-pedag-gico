-- Allow school members to read profiles of other members in same school
CREATE POLICY "school_members_read_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.school_members sm1
      JOIN public.school_members sm2 ON sm1.school_id = sm2.school_id
      WHERE sm1.user_id = auth.uid()
        AND sm2.user_id = profiles.user_id
    )
  );
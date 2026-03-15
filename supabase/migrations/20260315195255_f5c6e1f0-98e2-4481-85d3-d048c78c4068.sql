
-- Table for manually uploaded files to student folders
CREATE TABLE public.student_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.class_students(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'outros',
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.student_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_own_student_files" ON public.student_files
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.class_students cs
    WHERE cs.id = student_files.student_id
      AND public.is_class_owner(auth.uid(), cs.class_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.class_students cs
    WHERE cs.id = student_files.student_id
      AND public.is_class_owner(auth.uid(), cs.class_id)
  ));

-- Storage RLS for activity-files bucket
CREATE POLICY "teacher_upload_activity_files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-files');

CREATE POLICY "teacher_read_activity_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'activity-files');

CREATE POLICY "teacher_delete_activity_files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'activity-files');

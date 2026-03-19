-- Fix overly permissive activity-files storage policies
DROP POLICY IF EXISTS "teacher_read_activity_files" ON storage.objects;
DROP POLICY IF EXISTS "teacher_upload_activity_files" ON storage.objects;
DROP POLICY IF EXISTS "teacher_delete_activity_files" ON storage.objects;

-- Re-create with path-based ownership (user_id is first folder segment)
CREATE POLICY "teacher_read_activity_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'activity-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "teacher_upload_activity_files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'activity-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "teacher_delete_activity_files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'activity-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
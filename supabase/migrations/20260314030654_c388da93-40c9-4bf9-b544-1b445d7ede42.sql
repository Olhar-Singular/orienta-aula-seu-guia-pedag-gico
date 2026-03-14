
-- Create pdf_uploads table
CREATE TABLE public.pdf_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  description TEXT,
  questions_extracted INT DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pdf_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_pdf_uploads" ON public.pdf_uploads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create question-pdfs private bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('question-pdfs', 'question-pdfs', false);

-- Storage policies for question-pdfs
CREATE POLICY "Users can upload their own pdfs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'question-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read their own pdfs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'question-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own pdfs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'question-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

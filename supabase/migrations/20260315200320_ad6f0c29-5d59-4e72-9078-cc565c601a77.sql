
CREATE TABLE public.student_pei (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.class_students(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  student_profile text DEFAULT '',
  goals jsonb DEFAULT '[]'::jsonb,
  curricular_adaptations text DEFAULT '',
  resources_and_support text DEFAULT '',
  pedagogical_strategies text DEFAULT '',
  review_schedule text DEFAULT '',
  additional_notes text DEFAULT '',
  generated_by_ai boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id)
);

ALTER TABLE public.student_pei ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_own_pei" ON public.student_pei
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.class_students cs
    WHERE cs.id = student_pei.student_id
      AND public.is_class_owner(auth.uid(), cs.class_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.class_students cs
    WHERE cs.id = student_pei.student_id
      AND public.is_class_owner(auth.uid(), cs.class_id)
  ));

-- Trigger to auto-update updated_at
CREATE TRIGGER update_student_pei_updated_at
  BEFORE UPDATE ON public.student_pei
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

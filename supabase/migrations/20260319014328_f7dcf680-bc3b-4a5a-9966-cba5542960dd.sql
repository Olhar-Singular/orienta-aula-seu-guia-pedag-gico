-- student_barriers: change CASCADE to SET NULL
ALTER TABLE public.student_barriers ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.student_barriers DROP CONSTRAINT student_barriers_student_id_fkey;
ALTER TABLE public.student_barriers ADD CONSTRAINT student_barriers_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.class_students(id) ON DELETE SET NULL;

-- student_files: change CASCADE to SET NULL
ALTER TABLE public.student_files ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.student_files DROP CONSTRAINT student_files_student_id_fkey;
ALTER TABLE public.student_files ADD CONSTRAINT student_files_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.class_students(id) ON DELETE SET NULL;

-- student_pei: change CASCADE to SET NULL
ALTER TABLE public.student_pei ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.student_pei DROP CONSTRAINT student_pei_student_id_fkey;
ALTER TABLE public.student_pei ADD CONSTRAINT student_pei_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.class_students(id) ON DELETE SET NULL;
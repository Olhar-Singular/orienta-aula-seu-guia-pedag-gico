-- Fix school_id FK to SET NULL on delete (currently RESTRICT)
ALTER TABLE ai_usage_logs DROP CONSTRAINT IF EXISTS ai_usage_logs_school_id_fkey;
ALTER TABLE ai_usage_logs ADD CONSTRAINT ai_usage_logs_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE SET NULL;
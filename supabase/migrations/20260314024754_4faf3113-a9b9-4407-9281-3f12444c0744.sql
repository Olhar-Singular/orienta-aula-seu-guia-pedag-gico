
-- Shared adaptations table
CREATE TABLE public.shared_adaptations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adaptation_id uuid REFERENCES public.adaptations_history(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Validation trigger (not CHECK constraint) for expires_at
CREATE OR REPLACE FUNCTION public.validate_shared_adaptation_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'expires_at must be in the future';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_shared_expiry
  BEFORE INSERT ON public.shared_adaptations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_shared_adaptation_expiry();

-- RLS
ALTER TABLE public.shared_adaptations ENABLE ROW LEVEL SECURITY;

-- Owners can manage their shared links
CREATE POLICY "owner_manage_shared"
  ON public.shared_adaptations
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Anyone can read by token (for public shared page)
CREATE POLICY "public_read_by_token"
  ON public.shared_adaptations
  FOR SELECT
  TO anon, authenticated
  USING (true);

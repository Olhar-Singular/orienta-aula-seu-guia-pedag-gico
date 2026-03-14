
-- Remove the overly permissive policy
DROP POLICY IF EXISTS "public_read_by_token" ON public.shared_adaptations;

-- Create a SECURITY DEFINER function to fetch a shared adaptation by token
CREATE OR REPLACE FUNCTION public.get_shared_adaptation(p_token text)
RETURNS TABLE(
  id uuid,
  adaptation_id uuid,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz,
  token text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, adaptation_id, expires_at, created_by, created_at, token
  FROM public.shared_adaptations
  WHERE token = p_token
    AND expires_at > now()
  LIMIT 1;
$$;

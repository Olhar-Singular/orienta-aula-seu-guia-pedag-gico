
-- 1. Create a security definer function to check if an adaptation is shared
CREATE OR REPLACE FUNCTION public.is_adaptation_shared(_adaptation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_adaptations
    WHERE adaptation_id = _adaptation_id
      AND expires_at > now()
  )
$$;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "public_read_shared_adaptations" ON public.adaptations_history;

-- 3. Recreate it using the security definer function (no more recursion)
CREATE POLICY "public_read_shared_adaptations"
ON public.adaptations_history
FOR SELECT
TO anon, authenticated
USING (public.is_adaptation_shared(id));

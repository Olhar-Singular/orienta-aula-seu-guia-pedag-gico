
CREATE OR REPLACE FUNCTION public.get_school_id_by_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.schools WHERE code = _code LIMIT 1;
$$;

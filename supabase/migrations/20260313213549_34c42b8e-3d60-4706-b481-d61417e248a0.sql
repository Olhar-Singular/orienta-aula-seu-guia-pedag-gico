
CREATE OR REPLACE FUNCTION public.sanitize_input(input text, max_length integer DEFAULT 5000)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT trim(left(regexp_replace(input, '<[^>]*>', '', 'g'), max_length));
$$;

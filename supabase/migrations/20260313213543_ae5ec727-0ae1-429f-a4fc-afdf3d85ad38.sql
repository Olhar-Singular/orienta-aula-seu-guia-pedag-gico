
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_name text;

CREATE OR REPLACE FUNCTION public.sanitize_input(input text, max_length integer DEFAULT 5000)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(left(regexp_replace(input, '<[^>]*>', '', 'g'), max_length));
$$;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id uuid PRIMARY KEY,
  request_count integer DEFAULT 0,
  window_start timestamptz DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits"
  ON public.rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits"
  ON public.rate_limits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate limits"
  ON public.rate_limits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


CREATE TABLE public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  school_id UUID REFERENCES public.schools(id),
  action_type TEXT NOT NULL,
  model TEXT NOT NULL,
  endpoint TEXT NOT NULL DEFAULT '',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_input NUMERIC(10, 6) DEFAULT 0,
  cost_output NUMERIC(10, 6) DEFAULT 0,
  cost_total NUMERIC(10, 6) DEFAULT 0,
  request_duration_ms INTEGER,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_model ON public.ai_usage_logs(model);
CREATE INDEX idx_ai_usage_logs_school_id ON public.ai_usage_logs(school_id);
CREATE INDEX idx_ai_usage_logs_period ON public.ai_usage_logs(created_at, model, action_type);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_school_ai_usage"
  ON public.ai_usage_logs FOR SELECT
  TO authenticated
  USING (
    school_id IS NOT NULL AND is_school_admin(auth.uid(), school_id)
  );

CREATE TABLE public.ai_model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  price_input_per_million NUMERIC(10, 4) NOT NULL,
  price_output_per_million NUMERIC(10, 4) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_model_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_pricing"
  ON public.ai_model_pricing FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.ai_model_pricing (model, provider, price_input_per_million, price_output_per_million) VALUES
  ('google/gemini-2.5-flash', 'google', 0.075, 0.30),
  ('google/gemini-2.5-pro', 'google', 1.25, 5.00),
  ('google/gemini-3-flash-preview', 'google', 0.10, 0.40),
  ('google/gemini-3.1-flash-image-preview', 'google', 0.10, 0.40);

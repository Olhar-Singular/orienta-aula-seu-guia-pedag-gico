
-- Tabela de planos
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE, -- 'free', 'essencial', 'profissional'
  display_name text NOT NULL,
  monthly_credits integer NOT NULL DEFAULT 0,
  price_cents integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.plans FOR SELECT
  USING (is_active = true);

-- Inserir planos padrão
INSERT INTO public.plans (name, display_name, monthly_credits, price_cents, features) VALUES
  ('free', 'Gratuito', 5, 0, '["adaptar_atividade","criar_atividade"]'::jsonb),
  ('essencial', 'Essencial', 30, 2990, '["adaptar_atividade","criar_atividade","chat_ia","exportar_pdf"]'::jsonb),
  ('profissional', 'Profissional', 100, 5990, '["adaptar_atividade","criar_atividade","chat_ia","exportar_pdf","perfil_aluno","modelos_favoritos","dashboard_metricas"]'::jsonb);

-- Tabela de assinaturas do usuário
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired'
  kiwify_subscription_id text,
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Tabela de uso de créditos
CREATE TABLE public.credit_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL, -- 'adaptation', 'chat', etc.
  credits_used integer NOT NULL DEFAULT 1,
  reference_id uuid, -- ID da adaptação gerada
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit usage"
  ON public.credit_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit usage"
  ON public.credit_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index para consulta rápida de créditos do mês
CREATE INDEX idx_credit_usage_user_month 
  ON public.credit_usage (user_id, created_at);

-- Função para contar créditos usados no período atual
CREATE OR REPLACE FUNCTION public.get_credits_used(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(credits_used), 0)::integer
  FROM public.credit_usage cu
  JOIN public.user_subscriptions us ON us.user_id = cu.user_id
  WHERE cu.user_id = p_user_id
    AND cu.created_at >= us.current_period_start
    AND cu.created_at < us.current_period_end;
$$;

-- Trigger para atribuir plano gratuito a novos usuários
CREATE OR REPLACE FUNCTION public.assign_free_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan_id)
  SELECT NEW.id, p.id FROM public.plans p WHERE p.name = 'free'
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_plan
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_free_plan();

-- Trigger de updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

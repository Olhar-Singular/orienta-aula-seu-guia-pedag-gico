import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PlanFeature =
  | "adaptar_atividade"
  | "criar_atividade"
  | "chat_ia"
  | "exportar_pdf"
  | "perfil_aluno"
  | "modelos_favoritos"
  | "dashboard_metricas";

type Plan = {
  id: string;
  name: string;
  display_name: string;
  monthly_credits: number;
  price_cents: number;
  features: PlanFeature[];
};

type Subscription = {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  plans: Plan;
};

export function useSubscription() {
  const { user } = useAuth();

  const { data: subscription, isLoading: loadingSub } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("*, plans(*)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Subscription | null;
    },
    enabled: !!user,
  });

  const { data: creditsUsed = 0, isLoading: loadingCredits } = useQuery({
    queryKey: ["credits-used", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_credits_used", {
        p_user_id: user!.id,
      });
      if (error) throw error;
      return (data as number) || 0;
    },
    enabled: !!user,
  });

  const plan = subscription?.plans || null;
  const planName = plan?.name || "free";
  const monthlyCredits = plan?.monthly_credits || 3;
  const creditsRemaining = Math.max(0, monthlyCredits - creditsUsed);
  const features = (plan?.features || ["adaptar_atividade", "criar_atividade"]) as PlanFeature[];

  const hasFeature = (feature: PlanFeature) => features.includes(feature);
  const hasCredits = creditsRemaining > 0;

  return {
    subscription,
    plan,
    planName,
    monthlyCredits,
    creditsUsed,
    creditsRemaining,
    features,
    hasFeature,
    hasCredits,
    loading: loadingSub || loadingCredits,
  };
}

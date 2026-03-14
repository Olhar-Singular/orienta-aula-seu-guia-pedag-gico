import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Zap, Crown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";

const featureLabels: Record<string, string> = {
  adaptar_atividade: "Adaptar atividade existente",
  criar_atividade: "Criar atividade do zero",
  chat_ia: "Chat com IA pedagógica",
  exportar_pdf: "Exportar em PDF",
  perfil_aluno: "Perfil do aluno",
  modelos_favoritos: "Modelos favoritos",
  dashboard_metricas: "Dashboard de métricas",
};

const planIcons: Record<string, React.ReactNode> = {
  free: <Zap className="w-6 h-6" />,
  essencial: <Star className="w-6 h-6" />,
  profissional: <Crown className="w-6 h-6" />,
};

const planColors: Record<string, string> = {
  free: "border-border",
  essencial: "border-primary ring-1 ring-primary/20",
  profissional: "border-accent ring-1 ring-accent/20",
};

// URLs dos checkouts na Kiwify — substituir pelos links reais
const KIWIFY_CHECKOUT_URLS: Record<string, string> = {
  essencial: "https://pay.kiwify.com.br/SEU_LINK_ESSENCIAL",
  profissional: "https://pay.kiwify.com.br/SEU_LINK_PROFISSIONAL",
};

export default function Pricing() {
  const { planName, loading: subLoading } = useSubscription();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("price_cents", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const handleCheckout = (name: string) => {
    const url = KIWIFY_CHECKOUT_URLS[name];
    if (url) window.open(url, "_blank");
  };

  return (
    <>
      <div className="space-y-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Escolha seu plano</h1>
          <p className="text-muted-foreground mt-1">
            Comece grátis. Faça upgrade quando precisar.
          </p>
        </motion.div>

        {isLoading || subLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full gradient-hero animate-pulse" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-6">
            {plans.map((plan, i) => {
              const isCurrent = plan.name === planName;
              const features = (plan.features as string[]) || [];
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className={`h-full flex flex-col ${planColors[plan.name] || ""} ${plan.name === "essencial" ? "relative" : ""}`}>
                    {plan.name === "essencial" && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="gradient-hero text-primary-foreground text-[10px]">Mais popular</Badge>
                      </div>
                    )}
                    <CardHeader className="text-center pb-2">
                      <div className="mx-auto w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-primary mb-2">
                        {planIcons[plan.name]}
                      </div>
                      <CardTitle className="text-lg">{plan.display_name}</CardTitle>
                      <div className="mt-2">
                        {plan.price_cents === 0 ? (
                          <span className="text-3xl font-bold text-foreground">Grátis</span>
                        ) : (
                          <div>
                            <span className="text-3xl font-bold text-foreground">
                              R${(plan.price_cents / 100).toFixed(2).replace(".", ",")}
                            </span>
                            <span className="text-sm text-muted-foreground">/mês</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.monthly_credits} créditos/mês
                      </p>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <ul className="space-y-2 flex-1 mb-4">
                        {features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            {featureLabels[f] || f}
                          </li>
                        ))}
                      </ul>
                      {isCurrent ? (
                        <Button disabled className="w-full" variant="secondary">
                          Plano atual
                        </Button>
                      ) : plan.name === "free" ? (
                        <Button disabled className="w-full" variant="outline">
                          Incluído
                        </Button>
                      ) : (
                        <Button
                          className={`w-full ${plan.name === "essencial" ? "gradient-hero text-primary-foreground" : "gradient-accent text-accent-foreground"}`}
                          onClick={() => handleCheckout(plan.name)}
                        >
                          Assinar agora
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Pagamento seguro via Kiwify. Cancele quando quiser.
        </p>
      </div>
    </>
  );
}

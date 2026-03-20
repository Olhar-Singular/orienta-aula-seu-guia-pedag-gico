import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AiUsageReport } from "@/types/aiUsage";

interface UseAiUsageReportOptions {
  period: "day" | "week" | "month";
  model?: string;
  actionType?: string;
}

export function useAiUsageReport(options: UseAiUsageReportOptions) {
  return useQuery<AiUsageReport>({
    queryKey: ["ai-usage-report", options],
    queryFn: async () => {
      const params = new URLSearchParams({ period: options.period });
      if (options.model) params.set("model", options.model);
      if (options.actionType) params.set("action_type", options.actionType);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-usage-report?${params}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      return response.json();
    },
    staleTime: 60_000,
    refetchInterval: 300_000,
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AiUsageReport } from "@/types/aiUsage";

interface UseAiUsageReportOptions {
  period: "day" | "week" | "month";
  model?: string;
  actionType?: string;
  schoolId?: string;
}

export function useAiUsageReport(options: UseAiUsageReportOptions) {
  return useQuery<AiUsageReport>({
    queryKey: ["ai-usage-report", options],
    queryFn: async () => {
      const params = new URLSearchParams({ period: options.period });
      if (options.model) params.set("model", options.model);
      if (options.actionType) params.set("action_type", options.actionType);
      if (options.schoolId) params.set("school_id", options.schoolId);

      const requestReport = (accessToken: string) =>
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-usage-report?${params}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      let response = await requestReport(session.access_token);

      if (response.status === 401) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshed.session) {
          await supabase.auth.signOut();
          throw new Error("Sessão expirada. Faça login novamente.");
        }

        response = await requestReport(refreshed.session.access_token);
      }

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

import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdaptationWizard from "@/components/adaptation/AdaptationWizard";
import { buildEditModeInitialData } from "@/lib/adaptationWizardHelpers";

export default function EditAdaptation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: row, isLoading, isFetching, isError } = useQuery({
    queryKey: ["adaptations-history-row", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("adaptations_history")
        .select("*")
        .eq("id", id!)
        .eq("teacher_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  const handleClose = () => {
    // Drop the per-row cache so the next edit session refetches v(n+1)
    // instead of mounting the wizard with stale v(n).
    queryClient.removeQueries({ queryKey: ["adaptations-history-row", id] });
    queryClient.invalidateQueries({ queryKey: ["adaptations-history-all"] });
    queryClient.invalidateQueries({ queryKey: ["adaptations-history"] });
    navigate("/my-adaptations");
  };

  // Wait for the *fresh* fetch — not just the cached value — before mounting
  // the wizard. AdaptationWizard initializes its state from `initialData` once
  // (useState lazy init), so feeding it stale data here would freeze the
  // editor on the previous version and cause subsequent saves to overwrite it.
  if (isLoading || isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !row) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Adaptação não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar essa adaptação. Ela pode ter sido excluída.
        </p>
        <Button variant="outline" onClick={() => navigate("/my-adaptations")}>
          Voltar para Minhas Adaptações
        </Button>
      </div>
    );
  }

  return (
    <AdaptationWizard
      editMode
      editingId={row.id}
      initialData={buildEditModeInitialData(row)}
      initialMode="ai"
      initialStepKey="ai_editor"
      onClose={handleClose}
    />
  );
}

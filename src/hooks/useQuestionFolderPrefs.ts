import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { FolderPref } from "@/lib/questionFolders";

interface Result {
  prefs: FolderPref[];
  loading: boolean;
  reorder: (next: FolderPref[]) => Promise<void>;
}

export function useQuestionFolderPrefs(): Result {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["question-folder-prefs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("question_folder_prefs")
        .select("folder_key, display_order")
        .eq("user_id", user!.id)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FolderPref[];
    },
  });

  const mutation = useMutation({
    mutationFn: async (next: FolderPref[]) => {
      if (!user) return;
      const rows = next.map((p) => ({
        user_id: user.id,
        folder_key: p.folder_key,
        display_order: p.display_order,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await (supabase.from as any)("question_folder_prefs").upsert(
        rows,
        { onConflict: "user_id,folder_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-folder-prefs", user?.id] });
    },
  });

  return {
    prefs: query.data ?? [],
    loading: query.isLoading,
    reorder: async (next) => {
      await mutation.mutateAsync(next);
    },
  };
}

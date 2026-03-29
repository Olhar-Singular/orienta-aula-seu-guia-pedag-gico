import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface School {
  id: string;
  name: string;
  code: string;
  member_count: number;
  created_at?: string;
}

async function invokeManageSchools(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-manage-schools", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useSchoolManagement() {
  const queryClient = useQueryClient();

  const query = useQuery<School[]>({
    queryKey: ["schools-admin"],
    queryFn: async () => {
      const data = await invokeManageSchools({ action: "list" });
      return data.schools ?? [];
    },
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: ({ name, code }: { name: string; code: string }) =>
      invokeManageSchools({ action: "create", name, code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools-admin"] });
      toast.success("Escola criada com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ school_id, name }: { school_id: string; name: string }) =>
      invokeManageSchools({ action: "update", school_id, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools-admin"] });
      toast.success("Escola atualizada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ school_id }: { school_id: string }) =>
      invokeManageSchools({ action: "delete", school_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools-admin"] });
      toast.success("Escola removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    schools: query.data ?? [],
    isLoading: query.isLoading,
    createSchool: createMutation.mutate,
    updateSchool: updateMutation.mutate,
    deleteSchool: deleteMutation.mutate,
  };
}

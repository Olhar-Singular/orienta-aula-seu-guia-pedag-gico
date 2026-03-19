import { useAuth } from "./useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserSchool() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["user-school", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("school_members")
        .select("school_id, role, schools(name, code)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return {
    schoolId: query.data?.school_id ?? null,
    schoolName: (query.data?.schools as any)?.name ?? null,
    schoolCode: (query.data?.schools as any)?.code ?? null,
    memberRole: query.data?.role ?? null,
    isLoading: query.isLoading,
    hasSchool: !!query.data?.school_id,
  };
}

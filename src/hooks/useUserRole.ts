import { useAuth } from "./useAuth";
import { useUserSchool } from "./useUserSchool";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EffectiveRole = "teacher" | "gestor" | "admin";

export function useUserRole() {
  const { user } = useAuth();
  const school = useUserSchool();

  const profileQuery = useQuery({
    queryKey: ["user-profile-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const profile = profileQuery.data as Record<string, unknown> | null | undefined;
  const isSuperAdmin = profile?.is_super_admin === true;
  const isActive = profile?.is_active !== false;

  let role: EffectiveRole = "teacher";
  if (isSuperAdmin) {
    role = "admin";
  } else if (school.memberRole === "gestor") {
    role = "gestor";
  }

  return {
    role,
    isSuperAdmin,
    isGestor: role === "gestor",
    isTeacher: role === "teacher",
    isActive,
    isLoading: school.isLoading || profileQuery.isLoading,
    hasSchool: school.hasSchool,
  };
}

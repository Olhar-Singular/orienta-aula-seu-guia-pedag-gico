import { useAuth } from "./useAuth";
import { useUserSchool } from "./useUserSchool";

export type EffectiveRole = "teacher" | "gestor" | "admin";

export function useUserRole() {
  const { user } = useAuth();
  const school = useUserSchool();

  let role: EffectiveRole = "teacher";
  if (school.memberRole === "admin") {
    role = "admin";
  } else if (school.memberRole === "gestor") {
    role = "gestor";
  }

  return {
    role,
    isSuperAdmin: role === "admin",
    isGestor: role === "gestor",
    isTeacher: role === "teacher",
    isActive: true,
    isLoading: school.isLoading,
    hasSchool: school.hasSchool,
  };
}

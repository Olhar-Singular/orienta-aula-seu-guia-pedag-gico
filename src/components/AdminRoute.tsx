import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserSchool } from "@/hooks/useUserSchool";
import { Loader2 } from "lucide-react";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isLoading: schoolLoading, memberRole } = useUserSchool();

  if (authLoading || schoolLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || memberRole !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

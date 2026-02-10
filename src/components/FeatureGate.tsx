import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useSubscription, PlanFeature } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";

type Props = {
  feature: PlanFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function FeatureGate({ feature, children, fallback }: Props) {
  const { hasFeature, loading } = useSubscription();

  if (loading) return null;

  if (hasFeature(feature)) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4 border border-dashed border-border rounded-xl bg-muted/30">
      <Lock className="w-10 h-10 text-muted-foreground" />
      <div>
        <p className="font-semibold text-foreground">Recurso exclusivo de planos pagos</p>
        <p className="text-sm text-muted-foreground mt-1">
          Faça upgrade para acessar esta funcionalidade.
        </p>
      </div>
      <Link to="/pricing">
        <Button size="sm">Ver planos</Button>
      </Link>
    </div>
  );
}

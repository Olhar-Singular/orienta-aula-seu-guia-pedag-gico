import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

export default function CreditGuard({ children }: Props) {
  const { hasCredits, creditsRemaining, loading } = useSubscription();

  if (loading) return null;

  if (hasCredits) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4 border border-dashed border-border rounded-xl bg-muted/30">
      <Zap className="w-10 h-10 text-muted-foreground" />
      <div>
        <p className="font-semibold text-foreground">Seus créditos acabaram este mês</p>
        <p className="text-sm text-muted-foreground mt-1">
          Você usou todos os {creditsRemaining === 0 ? "seus" : ""} créditos deste ciclo.
        </p>
      </div>
      <Link to="/pricing">
        <Button size="sm">Fazer upgrade</Button>
      </Link>
    </div>
  );
}

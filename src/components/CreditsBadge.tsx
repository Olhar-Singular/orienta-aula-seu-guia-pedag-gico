import { Zap } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function CreditsBadge({ showProgress = false }: { showProgress?: boolean }) {
  const { creditsRemaining, monthlyCredits, planName, loading } = useSubscription();

  if (loading) return null;

  const percent = monthlyCredits > 0 ? ((monthlyCredits - creditsRemaining) / monthlyCredits) * 100 : 100;
  const displayName = planName === "free" ? "Gratuito" : planName === "essencial" ? "Essencial" : "Profissional";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-accent" />
        <span className="text-xs font-medium text-primary-foreground/80">
          {creditsRemaining}/{monthlyCredits} créditos
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {displayName}
        </Badge>
      </div>
      {showProgress && (
        <Progress value={percent} className="h-1.5 bg-primary-foreground/20" />
      )}
    </div>
  );
}

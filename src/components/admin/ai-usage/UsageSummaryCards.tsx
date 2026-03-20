import { Card, CardContent } from "@/components/ui/card";
import { Brain, DollarSign, Clock, AlertTriangle } from "lucide-react";
import type { AiUsageSummary } from "@/types/aiUsage";

interface Props {
  summary: AiUsageSummary;
}

export function UsageSummaryCards({ summary }: Props) {
  const errorRate = summary.total_requests > 0
    ? ((summary.error_count / summary.total_requests) * 100).toFixed(1)
    : "0.0";

  const cards = [
    {
      title: "Total de Tokens",
      value: summary.total_tokens.toLocaleString("pt-BR"),
      subtitle: `${summary.total_input_tokens.toLocaleString("pt-BR")} entrada · ${summary.total_output_tokens.toLocaleString("pt-BR")} saída`,
      icon: Brain,
      iconClass: "text-primary",
    },
    {
      title: "Custo Estimado",
      value: `$${summary.total_cost.toFixed(4)}`,
      subtitle: `${summary.total_requests} requisições`,
      icon: DollarSign,
      iconClass: "text-emerald-600",
    },
    {
      title: "Tempo Médio",
      value: `${Math.round(summary.avg_duration_ms)}ms`,
      subtitle: "por requisição",
      icon: Clock,
      iconClass: "text-violet-600",
    },
    {
      title: "Taxa de Erro",
      value: `${errorRate}%`,
      subtitle: `${summary.error_count} erro${summary.error_count !== 1 ? "s" : ""}`,
      icon: AlertTriangle,
      iconClass: summary.error_count > 0 ? "text-destructive" : "text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
              <card.icon className={`w-5 h-5 ${card.iconClass}`} />
            </div>
            <p className="text-2xl font-bold tracking-tight">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

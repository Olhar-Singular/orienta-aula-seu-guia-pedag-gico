import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Layers, AlertCircle, Star } from "lucide-react";

type Props = {
  totalAdaptations: number;
  distinctActivityTypes: number;
  activeBarriers: number;
  topBarrierLabel: string | null;
};

export default function ReportSummaryCards({
  totalAdaptations,
  distinctActivityTypes,
  activeBarriers,
  topBarrierLabel,
}: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <SummaryCard
        icon={<BarChart3 className="w-6 h-6 text-primary" />}
        value={totalAdaptations}
        label="Adaptações"
      />
      <SummaryCard
        icon={<Layers className="w-6 h-6 text-primary" />}
        value={distinctActivityTypes}
        label="Tipos de atividade"
      />
      <SummaryCard
        icon={<AlertCircle className="w-6 h-6 text-primary" />}
        value={activeBarriers}
        label="Barreiras ativas"
      />
      <SummaryCard
        icon={<Star className="w-6 h-6 text-primary" />}
        value={topBarrierLabel ?? "Nenhuma"}
        label="Barreira mais frequente"
      />
    </div>
  );
}

function SummaryCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-4 text-center space-y-1">
        <div className="flex justify-center">{icon}</div>
        <p className="text-xl font-bold text-foreground break-words">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

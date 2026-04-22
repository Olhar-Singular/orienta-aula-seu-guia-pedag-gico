import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { PeriodDiff } from "@/lib/studentReport/compare";
import type { PeriodPreset } from "@/lib/studentReport/periodFilter";

type Props = {
  preset: PeriodPreset;
  diff: PeriodDiff;
  onChange: (preset: PeriodPreset) => void;
};

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return `${delta}`;
}

function DeltaRow({ label, delta }: { label: string; delta: number }) {
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const tone =
    delta > 0
      ? "text-emerald-600"
      : delta < 0
        ? "text-rose-600"
        : "text-muted-foreground";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-foreground">{label}</span>
      <span className={`flex items-center gap-1 font-medium ${tone}`}>
        <Icon className="w-3.5 h-3.5" />
        {formatDelta(delta)}
      </span>
    </div>
  );
}

export default function ReportPeriodComparison({ preset, diff, onChange }: Props) {
  const is30 = preset === "LAST_30_DAYS";
  const is60 = preset === "LAST_60_DAYS";

  return (
    <Card className="border-border">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">Comparação com período anterior</CardTitle>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={is30 ? "default" : "outline"}
            onClick={() => onChange("LAST_30_DAYS")}
          >
            30 dias
          </Button>
          <Button
            size="sm"
            variant={is60 ? "default" : "outline"}
            onClick={() => onChange("LAST_60_DAYS")}
          >
            60 dias
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <DeltaRow label="Adaptações" delta={diff.adaptationsDelta} />
        <DeltaRow label="Barreiras distintas" delta={diff.distinctBarriersDelta} />
        <DeltaRow label="Estratégias aplicadas" delta={diff.strategiesDelta} />
      </CardContent>
    </Card>
  );
}

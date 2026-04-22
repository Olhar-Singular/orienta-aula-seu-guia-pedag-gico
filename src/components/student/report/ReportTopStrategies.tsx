import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StrategyCount } from "@/lib/studentReport/metrics";

const MAX_STRATEGIES = 5;

type Props = {
  data: StrategyCount[];
};

export default function ReportTopStrategies({ data }: Props) {
  const slice = data.slice(0, MAX_STRATEGIES);

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Estratégias mais aplicadas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {slice.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Sem estratégias registradas no período.
          </p>
        ) : (
          <ul className="space-y-1">
            {slice.map((s) => (
              <li key={s.name} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{s.name}</span>
                <Badge variant="secondary">{s.count}x</Badge>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground">
          Este bloco reflete a frequência de uso, não a eficácia. A medição de
          eficácia real depende de feedback do professor (em breve).
        </p>
      </CardContent>
    </Card>
  );
}

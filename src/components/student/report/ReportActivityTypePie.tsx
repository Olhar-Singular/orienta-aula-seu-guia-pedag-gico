import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityTypeCount } from "@/lib/studentReport/metrics";

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  exercicio: "Exercício",
  avaliacao: "Avaliação",
  projeto: "Projeto",
  leitura: "Leitura",
  redacao: "Redação",
  desconhecido: "Outro",
};

function labelize(type: string): string {
  return ACTIVITY_TYPE_LABELS[type] ?? type;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.7)",
  "hsl(var(--primary) / 0.5)",
  "hsl(var(--primary) / 0.35)",
  "hsl(var(--muted-foreground))",
];

type Props = {
  data: ActivityTypeCount[];
};

export default function ReportActivityTypePie({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Distribuição por tipo de atividade</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Sem dados suficientes no período.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.map((d, idx) => {
              const percent = total > 0 ? Math.round((d.count / total) * 100) : 0;
              return (
                <li key={d.activityType} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-2 text-foreground">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      {labelize(d.activityType)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {d.count} · {percent}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: COLORS[idx % COLORS.length],
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

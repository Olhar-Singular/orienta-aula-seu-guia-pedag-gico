import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { AiUsageByModel } from "@/types/aiUsage";
import { Brain } from "lucide-react";

interface Props {
  data: AiUsageByModel;
}

function formatTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

export function TokensByModelChart({ data }: Props) {
  const chartData = Object.entries(data).map(([model, stats]) => ({
    name: model.split("/").pop() || model,
    input: stats.input_tokens,
    output: stats.output_tokens,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-2">
        <Brain className="w-8 h-8 opacity-40" />
        <p className="text-sm">Nenhum uso de IA registrado</p>
        <p className="text-xs">no período selecionado</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis tickFormatter={formatTokens} className="text-xs" />
        <Tooltip
          formatter={(value: number, name: string) => [
            value.toLocaleString("pt-BR"),
            name === "input" ? "Entrada" : "Saída",
          ]}
          labelFormatter={(label) => `Modelo: ${label}`}
        />
        <Legend formatter={(v) => (v === "input" ? "Entrada" : "Saída")} />
        <Bar dataKey="input" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="output" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

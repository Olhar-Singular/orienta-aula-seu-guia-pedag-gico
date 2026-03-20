import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { AiUsageByModel } from "@/types/aiUsage";

interface Props {
  data: AiUsageByModel;
}

export function TokensByModelChart({ data }: Props) {
  const chartData = Object.entries(data).map(([model, stats]) => ({
    name: model.split("/").pop() || model,
    input: stats.input_tokens,
    output: stats.output_tokens,
    cost: stats.total_cost,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Nenhum dado disponível
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
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

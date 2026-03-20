import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { AiUsageByDay } from "@/types/aiUsage";

interface Props {
  data: AiUsageByDay;
}

export function TokensByDayChart({ data }: Props) {
  const chartData = Object.entries(data)
    .map(([date, stats]) => ({
      date: new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      sortKey: date,
      tokens: stats.tokens,
      requests: stats.requests,
      cost: stats.cost,
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Nenhum dado disponível
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" className="text-xs" />
        <YAxis yAxisId="tokens" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
        <YAxis yAxisId="requests" orientation="right" className="text-xs" />
        <Tooltip
          formatter={(value: number, name: string) => [
            name === "tokens" ? value.toLocaleString("pt-BR") : value,
            name === "tokens" ? "Tokens" : "Requisições",
          ]}
        />
        <Legend formatter={(v) => (v === "tokens" ? "Tokens" : "Requisições")} />
        <Line yAxisId="tokens" type="monotone" dataKey="tokens" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        <Line yAxisId="requests" type="monotone" dataKey="requests" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

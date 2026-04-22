import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import type { MonthCount } from "@/lib/studentReport/metrics";

const chartConfig: ChartConfig = {
  count: { label: "Adaptações", color: "hsl(var(--primary))" },
};

type Props = {
  data: MonthCount[];
};

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${m}/${y.slice(2)}`;
}

export default function ReportAdaptationsTimeline({ data }: Props) {
  if (data.length < 2) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Evolução temporal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground py-6 text-center">
            A linha de evolução precisa de pelo menos 2 meses com adaptações.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({ month: formatMonth(d.month), count: d.count }));

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Evolução temporal</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--color-count)"
              strokeWidth={2}
              dot
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

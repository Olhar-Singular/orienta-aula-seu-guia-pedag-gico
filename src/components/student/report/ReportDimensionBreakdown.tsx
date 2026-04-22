import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";
import type { DimensionCount } from "@/lib/studentReport/metrics";

type Props = {
  data: DimensionCount[];
};

export default function ReportDimensionBreakdown({ data }: Props) {
  const countByDimension = new Map(data.map((d) => [d.dimension, d.count]));
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Barreiras por dimensão</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {BARRIER_DIMENSIONS.map((dim) => {
            const count = countByDimension.get(dim.key) ?? 0;
            return (
              <div key={dim.key}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-foreground font-medium">{dim.label}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

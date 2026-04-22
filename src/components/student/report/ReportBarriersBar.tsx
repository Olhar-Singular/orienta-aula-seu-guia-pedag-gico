import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";
import type { BarrierFrequencyItem } from "@/lib/studentReport/metrics";

const MAX_BARS = 8;

function barrierLabel(key: string): string {
  for (const dim of BARRIER_DIMENSIONS) {
    const b = dim.barriers.find((b) => b.key === key);
    if (b) return b.label;
  }
  return key;
}

type Props = {
  data: BarrierFrequencyItem[];
};

export default function ReportBarriersBar({ data }: Props) {
  const slice = data.slice(0, MAX_BARS);
  const max = slice.length > 0 ? Math.max(...slice.map((d) => d.count)) : 1;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Barreiras mais frequentes</CardTitle>
      </CardHeader>
      <CardContent>
        {slice.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Sem barreiras registradas no período.
          </p>
        ) : (
          <ul className="space-y-2">
            {slice.map((d) => (
              <li key={d.barrierKey} className="text-sm">
                <div className="flex justify-between mb-0.5">
                  <span className="text-foreground truncate pr-2">
                    {barrierLabel(d.barrierKey)}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {d.count}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(d.count / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

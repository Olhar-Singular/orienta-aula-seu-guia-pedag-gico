import { useMemo, useState } from "react";
import { Loader2, FileText, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useStudentReportData } from "@/hooks/useStudentReportData";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";
import {
  activityTypeDistribution,
  adaptationsByMonth,
  barrierFrequency,
  dimensionBreakdown,
  summarize,
  topStrategies,
} from "@/lib/studentReport/metrics";
import {
  filterByPeriod,
  presetRange,
  type PeriodPreset,
} from "@/lib/studentReport/periodFilter";
import { diffPeriods } from "@/lib/studentReport/compare";
import { generateObservations } from "@/lib/studentReport/observations";

import ReportSummaryCards from "./report/ReportSummaryCards";
import ReportActivityTypePie from "./report/ReportActivityTypePie";
import ReportBarriersBar from "./report/ReportBarriersBar";
import ReportDimensionBreakdown from "./report/ReportDimensionBreakdown";
import ReportAdaptationsTimeline from "./report/ReportAdaptationsTimeline";
import ReportTopStrategies from "./report/ReportTopStrategies";
import ReportObservations from "./report/ReportObservations";
import ReportPeriodComparison from "./report/ReportPeriodComparison";

type Props = {
  studentId: string;
};

function barrierLabel(key: string): string {
  for (const dim of BARRIER_DIMENSIONS) {
    const b = dim.barriers.find((b) => b.key === key);
    if (b) return b.label;
  }
  return key;
}

function previousPreset(preset: PeriodPreset): PeriodPreset {
  return preset === "LAST_30_DAYS" ? "PREV_30_DAYS" : "PREV_60_DAYS";
}

export default function StudentCognitiveReport({ studentId }: Props) {
  const { data, isLoading } = useStudentReportData(studentId);
  const [preset, setPreset] = useState<PeriodPreset>("LAST_30_DAYS");

  const computed = useMemo(() => {
    const history = data?.history ?? [];
    const barriers = data?.barriers ?? [];

    const now = new Date();
    const currentRange = presetRange(preset, now);
    const previousRange = presetRange(previousPreset(preset), now);
    const currentHistory = filterByPeriod(history, currentRange);
    const previousHistory = filterByPeriod(history, previousRange);

    const summary = summarize(currentHistory, barriers);
    const freq = barrierFrequency(currentHistory);
    const activityTypes = activityTypeDistribution(currentHistory);
    const dims = dimensionBreakdown(currentHistory);
    const byMonth = adaptationsByMonth(currentHistory);
    const strategies = topStrategies(currentHistory);

    const currentAggregate = {
      adaptations: currentHistory.length,
      distinctBarriers: freq.length,
      strategies: strategies.length,
    };
    const previousAggregate = {
      adaptations: previousHistory.length,
      distinctBarriers: barrierFrequency(previousHistory).length,
      strategies: topStrategies(previousHistory).length,
    };
    const diff = diffPeriods(currentAggregate, previousAggregate);

    const total = currentHistory.length;
    const topBarrier = freq[0];
    const dominantShare = total > 0 && topBarrier ? topBarrier.count / total : 0;
    const observations = generateObservations({
      totalAdaptations: total,
      topBarrier: topBarrier
        ? { label: barrierLabel(topBarrier.barrierKey), share: dominantShare }
        : null,
      dominantBarrierShare: dominantShare,
      topStrategy: strategies[0] ?? null,
      trend:
        diff.adaptationsDelta > 0
          ? "up"
          : diff.adaptationsDelta < 0
            ? "down"
            : "flat",
    });

    return {
      history,
      summary,
      freq,
      activityTypes,
      dims,
      byMonth,
      strategies,
      diff,
      observations,
      topBarrierLabel: topBarrier ? barrierLabel(topBarrier.barrierKey) : null,
    };
  }, [data, preset]);

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="py-10 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
          Carregando relatório…
        </CardContent>
      </Card>
    );
  }

  if (computed.history.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-10 text-center space-y-3">
          <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Ainda não há adaptações registradas para este aluno.
          </p>
          <Button asChild size="sm">
            <Link to="/dashboard/adaptar">
              <BookOpen className="w-4 h-4 mr-1.5" />
              Criar primeira adaptação
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <ReportSummaryCards
        totalAdaptations={computed.summary.totalAdaptations}
        distinctActivityTypes={computed.summary.distinctActivityTypes}
        activeBarriers={computed.summary.activeBarriers}
        topBarrierLabel={computed.topBarrierLabel}
      />

      <ReportPeriodComparison
        preset={preset}
        diff={computed.diff}
        onChange={setPreset}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <ReportActivityTypePie data={computed.activityTypes} />
        <ReportBarriersBar data={computed.freq} />
      </div>

      <ReportDimensionBreakdown data={computed.dims} />

      <ReportAdaptationsTimeline data={computed.byMonth} />

      <div className="grid md:grid-cols-2 gap-4">
        <ReportTopStrategies data={computed.strategies} />
        <ReportObservations observations={computed.observations} />
      </div>
    </div>
  );
}

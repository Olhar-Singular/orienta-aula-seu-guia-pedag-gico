import { useState } from "react";
import { useAiUsageReport } from "@/hooks/useAiUsageReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageSummaryCards } from "@/components/admin/ai-usage/UsageSummaryCards";
import { TokensByModelChart } from "@/components/admin/ai-usage/TokensByModelChart";
import { TokensByDayChart } from "@/components/admin/ai-usage/TokensByDayChart";
import { UsageLogTable } from "@/components/admin/ai-usage/UsageLogTable";
import { Brain, Activity, Clock, AlertCircle } from "lucide-react";

type Period = "day" | "week" | "month";

const ACTION_LABELS: Record<string, string> = {
  adaptation: "Adaptação",
  adaptation_wizard: "Wizard",
  chat: "Chat",
  barrier_analysis: "Barreiras",
  question_extraction: "Extração",
  pei_generation: "PEI",
};

export default function AiUsageReport() {
  const [period, setPeriod] = useState<Period>("week");
  const [modelFilter, setModelFilter] = useState<string>("");

  const { data: report, isLoading, error } = useAiUsageReport({
    period,
    model: modelFilter && modelFilter !== "all" ? modelFilter : undefined,
  });

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Relatório de Uso de IA</h1>
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <p>Erro ao carregar relatório: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatório de Uso de IA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoramento de tokens, custos e performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="day">Hoje</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mês</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos os modelos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os modelos</SelectItem>
              <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
              <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : report?.summary ? (
        <UsageSummaryCards summary={report.summary} />
      ) : null}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              Tokens por Modelo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <TokensByModelChart data={report?.by_model || {}} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Uso por Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <TokensByDayChart data={report?.by_day || {}} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Type Breakdown */}
      {report?.by_action_type && Object.keys(report.by_action_type).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Uso por Tipo de Ação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(report.by_action_type).map(([action, stats]) => (
                <div key={action} className="rounded-lg border p-4 space-y-1">
                  <p className="text-sm font-medium capitalize">
                    {ACTION_LABELS[action] || action.replace(/_/g, " ")}
                  </p>
                  <p className="text-xl font-bold tabular-nums">{stats.requests}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.tokens >= 1_000 ? `${(stats.tokens / 1_000).toFixed(1)}k` : stats.tokens.toLocaleString("pt-BR")} tokens · ${stats.cost.toFixed(4)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Log Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Histórico Detalhado
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <UsageLogTable logs={report?.logs || []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

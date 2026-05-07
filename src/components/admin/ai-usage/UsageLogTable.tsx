import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import type { AiUsageLog } from "@/types/aiUsage";
import { labelForActionType } from "@/lib/aiUsageLabels";

interface Props {
  logs: AiUsageLog[];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString("pt-BR");
}

export function UsageLogTable({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
        <Clock className="w-8 h-8 opacity-40" />
        <p className="text-sm">Nenhum registro encontrado</p>
        <p className="text-xs">no período selecionado</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[28rem]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/Hora</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Entrada</TableHead>
            <TableHead className="text-right">Saída</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Custo</TableHead>
            <TableHead className="text-right">Duração</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const isEstimated = log.tokens_source === "estimated";
            const costTotal = Number(log.cost_total ?? 0);
            return (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-xs tabular-nums">
                  {new Date(log.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs font-mono">
                    {log.model.split("/").pop()}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {labelForActionType(log.action_type)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  {formatTokens(log.input_tokens)}
                  {isEstimated && <span className="text-muted-foreground ml-0.5">~</span>}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  {formatTokens(log.output_tokens)}
                  {isEstimated && <span className="text-muted-foreground ml-0.5">~</span>}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs font-medium">
                  {formatTokens(log.total_tokens)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  ${costTotal.toFixed(6)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  {log.request_duration_ms
                    ? log.request_duration_ms > 1000
                      ? `${(log.request_duration_ms / 1000).toFixed(1)}s`
                      : `${log.request_duration_ms}ms`
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      log.status === "success"
                        ? "default"
                        : log.status === "timeout"
                        ? "secondary"
                        : "destructive"
                    }
                    className="text-xs"
                  >
                    {log.status === "success" ? "OK" : log.status === "timeout" ? "Timeout" : "Erro"}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AiUsageLog } from "@/types/aiUsage";

interface Props {
  logs: AiUsageLog[];
}

const ACTION_LABELS: Record<string, string> = {
  adaptation: "Adaptação",
  adaptation_wizard: "Wizard",
  chat: "Chat",
  barrier_analysis: "Barreiras",
  question_extraction: "Extração",
  pei_generation: "PEI",
};

export function UsageLogTable({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Nenhum registro encontrado
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
          {logs.map((log) => (
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
                {ACTION_LABELS[log.action_type] || log.action_type}
              </TableCell>
              <TableCell className="text-right tabular-nums text-xs">
                {log.input_tokens.toLocaleString("pt-BR")}
              </TableCell>
              <TableCell className="text-right tabular-nums text-xs">
                {log.output_tokens.toLocaleString("pt-BR")}
              </TableCell>
              <TableCell className="text-right tabular-nums text-xs font-medium">
                {log.total_tokens.toLocaleString("pt-BR")}
              </TableCell>
              <TableCell className="text-right tabular-nums text-xs">
                ${log.cost_total.toFixed(6)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-xs">
                {log.request_duration_ms ? `${log.request_duration_ms}ms` : "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant={log.status === "success" ? "default" : "destructive"}
                  className="text-xs"
                >
                  {log.status === "success" ? "OK" : log.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

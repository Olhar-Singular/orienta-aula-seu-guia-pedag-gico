import { Brain, FileText, Files, MessageSquare, ClipboardList, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextIndicatorProps {
  hasBarriers: boolean;
  hasPEI: boolean;
  hasDocuments: boolean;
  hasChatHistory: boolean;
  hasActivityContext: boolean;
}

export default function ContextIndicator({
  hasBarriers,
  hasPEI,
  hasDocuments,
  hasChatHistory,
  hasActivityContext,
}: ContextIndicatorProps) {
  const pillars = [
    { label: "Barreiras", active: hasBarriers, icon: Brain },
    { label: "PEI", active: hasPEI, icon: FileText },
    { label: "Documentos", active: hasDocuments, icon: Files },
    { label: "Chat", active: hasChatHistory, icon: MessageSquare },
    { label: "Atividade", active: hasActivityContext, icon: ClipboardList },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
      <span className="text-xs text-muted-foreground font-medium">Pilares utilizados:</span>
      {pillars.map((p) => (
        <div
          key={p.label}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
            p.active
              ? "bg-primary/10 text-primary font-medium"
              : "bg-muted text-muted-foreground"
          )}
        >
          <p.icon className="w-3 h-3" />
          {p.label}
          {p.active ? (
            <CheckCircle2 className="w-3 h-3 text-green-500" />
          ) : (
            <Circle className="w-3 h-3 opacity-30" />
          )}
        </div>
      ))}
    </div>
  );
}

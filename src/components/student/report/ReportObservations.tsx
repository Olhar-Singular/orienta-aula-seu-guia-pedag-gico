import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

type Props = {
  observations: string[];
};

export default function ReportObservations({ observations }: Props) {
  if (observations.length === 0) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          Observações pedagógicas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {observations.map((text, idx) => (
            <li key={idx} className="text-sm text-foreground leading-relaxed">
              {text}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground">
          Sugestões geradas a partir dos dados registrados — não substituem
          avaliação pedagógica individualizada.
        </p>
      </CardContent>
    </Card>
  );
}

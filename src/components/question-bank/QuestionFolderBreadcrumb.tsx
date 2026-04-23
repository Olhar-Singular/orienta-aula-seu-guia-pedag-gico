import { Button } from "@/components/ui/button";
import { ChevronRight, Home } from "lucide-react";
import { resolveUnclassifiedLabel } from "@/lib/questionFolders";

export type Crumb =
  | { kind: "root" }
  | { kind: "grade"; grade: string | null }
  | { kind: "subject"; grade: string | null; subject: string | null };

interface Props {
  crumbs: Crumb[];
  onNavigate: (crumb: Crumb) => void;
}

export default function QuestionFolderBreadcrumb({ crumbs, onNavigate }: Props) {
  return (
    <nav aria-label="Navegação de pastas" className="flex items-center gap-1 text-sm flex-wrap">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        const label = crumbLabel(c);
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
            {isLast ? (
              <span className="font-medium text-foreground px-2 py-1">{label}</span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => onNavigate(c)}
              >
                {i === 0 && <Home className="w-3 h-3 mr-1" />}
                {label}
              </Button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function crumbLabel(c: Crumb): string {
  switch (c.kind) {
    case "root":
      return "Banco";
    case "grade":
      return c.grade ?? resolveUnclassifiedLabel("grade");
    case "subject":
      return c.subject ?? resolveUnclassifiedLabel("subject");
  }
}

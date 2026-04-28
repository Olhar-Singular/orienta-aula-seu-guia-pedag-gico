import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Folder, FolderOpen, MoreVertical, Pencil, GripVertical } from "lucide-react";
import type { Folder as FolderType } from "@/lib/questionFolders";

interface Props {
  folder: FolderType;
  onOpen: () => void;
  onRename?: () => void;
  dragHandle?: React.ReactNode;
}

export default function QuestionFolderCard({ folder, onOpen, onRename, dragHandle }: Props) {
  const isEmpty = folder.count === 0;
  const Icon = isEmpty ? Folder : FolderOpen;

  return (
    <Card
      className="group cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onOpen}
      role="button"
      aria-label={`Abrir pasta ${folder.label}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {dragHandle ?? (
            <div className="mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <Icon className="w-8 h-8 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium truncate">{folder.label}</p>
              {onRename && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Ações da pasta ${folder.label}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={onRename}>
                      <Pencil className="w-4 h-4 mr-2" /> Renomear
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {folder.count} {folder.count === 1 ? "questão" : "questões"}
              </Badge>
              {folder.lastAt && (
                <span>
                  •{" "}
                  {new Date(folder.lastAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
              {folder.isEmpty && <Badge variant="outline" className="text-xs">Vazia</Badge>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

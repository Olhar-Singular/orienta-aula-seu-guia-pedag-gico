import { useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import QuestionFolderCard from "./QuestionFolderCard";
import {
  type Folder as FolderType,
  type FolderLevel,
  type FolderPref,
  buildFolderKey,
  sortFolders,
} from "@/lib/questionFolders";

interface Props {
  folders: FolderType[];
  prefs: FolderPref[];
  level: FolderLevel;
  parentGrade?: string | null;
  onOpen: (folder: FolderType) => void;
  onRename?: (folder: FolderType) => void;
  onReorder?: (next: FolderPref[]) => void;
}

export default function QuestionFolderGrid({
  folders,
  prefs,
  level,
  parentGrade,
  onOpen,
  onRename,
  onReorder,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const sorted = useMemo(
    () => sortFolders(folders, prefs, level, parentGrade),
    [folders, prefs, level, parentGrade],
  );

  const sortableIds = sorted.map((f) => folderId(f, level, parentGrade));

  const handleDragEnd = (event: DragEndEvent) => {
    if (!onReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const nextOrder = arrayMove(sorted, oldIndex, newIndex);
    const nextPrefs: FolderPref[] = nextOrder.map((f, idx) => ({
      folder_key: buildFolderKey(level, f.key, parentGrade),
      display_order: idx,
    }));
    onReorder(nextPrefs);
  };

  if (sorted.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((f) => (
            <SortableFolder
              key={folderId(f, level, parentGrade)}
              id={folderId(f, level, parentGrade)}
              folder={f}
              onOpen={() => onOpen(f)}
              onRename={onRename ? () => onRename(f) : undefined}
              enableDrag={!!onReorder}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function folderId(f: FolderType, level: FolderLevel, parentGrade?: string | null): string {
  return buildFolderKey(level, f.key, parentGrade);
}

interface SortableProps {
  id: string;
  folder: FolderType;
  onOpen: () => void;
  onRename?: () => void;
  enableDrag: boolean;
}

function SortableFolder({ id, folder, onOpen, onRename, enableDrag }: SortableProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !enableDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const dragHandle = enableDrag ? (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="mt-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
      onClick={(e) => e.stopPropagation()}
      aria-label={`Reordenar ${folder.label}`}
    >
      <GripVertical className="w-4 h-4" />
    </button>
  ) : undefined;

  return (
    <div ref={setNodeRef} style={style}>
      <QuestionFolderCard
        folder={folder}
        onOpen={onOpen}
        onRename={onRename}
        dragHandle={dragHandle}
      />
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  type Folder,
  type FolderLevel,
  resolveUnclassifiedLabel,
  mergeFoldersWithEmpty,
} from "@/lib/questionFolders";

interface Options {
  grade?: string | null;
  enabled?: boolean;
}

interface Result {
  folders: Folder[];
  loading: boolean;
  error: Error | null;
}

type EmptyFolderRow = { grade: string | null; subject: string | null };

export function useQuestionFolders(level: FolderLevel, options: Options = {}): Result {
  const { user } = useAuth();
  const { grade = null, enabled = true } = options;

  const query = useQuery({
    queryKey: ["question-folders", level, grade, user?.id],
    enabled: enabled && !!user,
    queryFn: async () => {
      const [rpcResult, emptyResult] = await Promise.all([
        (supabase.rpc as any)("get_question_folders", {
          p_level: level,
          p_grade: level === "subject" ? grade : null,
        }),
        (supabase.from as any)("question_empty_folders").select("grade, subject"),
      ]);

      if (rpcResult.error) throw rpcResult.error;

      const rpcRows = (rpcResult.data ?? []) as unknown as Array<{
        folder_key: string | null;
        folder_count: number;
        last_at: string | null;
      }>;

      const folders: Folder[] = rpcRows.map((r) => ({
        key: r.folder_key,
        label: r.folder_key ?? resolveUnclassifiedLabel(level),
        count: Number(r.folder_count),
        lastAt: r.last_at,
        isEmpty: false,
      }));

      const emptyRows = (emptyResult.data ?? []) as EmptyFolderRow[];
      const emptyKeys =
        level === "grade"
          ? Array.from(
              new Set(
                emptyRows
                  .map((r) => r.grade)
                  .filter((g): g is string => !!g),
              ),
            )
          : emptyRows
              .filter((r) => r.grade === grade && !!r.subject)
              .map((r) => r.subject as string);

      return mergeFoldersWithEmpty(folders, emptyKeys);
    },
  });

  return {
    folders: query.data ?? [],
    loading: query.isLoading,
    error: query.error as Error | null,
  };
}

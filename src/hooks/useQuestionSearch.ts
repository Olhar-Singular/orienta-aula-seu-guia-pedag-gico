import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Question } from "@/components/question-bank/QuestionListView";

interface Options {
  query: string;
  enabled?: boolean;
}

interface Result {
  results: Question[];
  loading: boolean;
  error: Error | null;
}

/**
 * Busca questões em text, topic, subject e grade via ILIKE.
 * Escapa '%' e '_' no termo para evitar pattern injection.
 */
function escapeLike(value: string): string {
  return value.replace(/[%_]/g, (c) => `\\${c}`);
}

export function useQuestionSearch(options: Options): Result {
  const { user } = useAuth();
  const { query, enabled = true } = options;
  const term = query.trim();

  const q = useQuery({
    queryKey: ["question-search", term, user?.id],
    enabled: enabled && !!user && term.length >= 2,
    queryFn: async () => {
      const safe = escapeLike(term);
      const pattern = `%${safe}%`;
      const { data, error } = await (supabase.from as any)("question_bank")
        .select("*")
        .or(
          `text.ilike.${pattern},topic.ilike.${pattern},subject.ilike.${pattern},grade.ilike.${pattern}`,
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Question[];
    },
  });

  return {
    results: q.data ?? [],
    loading: q.isLoading,
    error: q.error as Error | null,
  };
}

export { escapeLike };

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Question } from "@/components/question-bank/QuestionListView";

interface Options {
  grade?: string | null | undefined;
  subject?: string | null | undefined;
  enabled?: boolean;
}

interface Result {
  questions: Question[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Busca questões do banco opcionalmente filtradas por grade e/ou subject.
 * Quando grade === undefined, não filtra por série (ex: busca global).
 * Quando grade === null, busca apenas questões sem série.
 */
export function useQuestions(options: Options = {}): Result {
  const { user } = useAuth();
  const { grade, subject, enabled = true } = options;

  const query = useQuery({
    queryKey: ["questions", grade, subject, user?.id],
    enabled: enabled && !!user,
    queryFn: async () => {
      let q: any = (supabase.from as any)("question_bank")
        .select("*")
        .order("created_at", { ascending: false });

      if (grade === null) q = q.is("grade", null);
      else if (typeof grade === "string") q = q.eq("grade", grade);

      if (subject === null) q = q.is("subject", null);
      else if (typeof subject === "string") q = q.eq("subject", subject);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Question[];
    },
  });

  return {
    questions: query.data ?? [],
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  AdaptationHistoryEntry,
  StudentBarrierRecord,
} from "@/lib/studentReport/metrics";

export type StudentReportData = {
  history: AdaptationHistoryEntry[];
  barriers: StudentBarrierRecord[];
};

async function fetchStudentReportData(studentId: string): Promise<StudentReportData> {
  const [historyRes, barriersRes] = await Promise.all([
    supabase
      .from("adaptations_history")
      .select("id, activity_type, created_at, barriers_used, adaptation_result")
      .eq("student_id", studentId)
      .order("created_at", { ascending: true }),
    supabase
      .from("student_barriers")
      .select("barrier_key, is_active")
      .eq("student_id", studentId),
  ]);

  if (historyRes.error) throw historyRes.error;
  if (barriersRes.error) throw barriersRes.error;

  return {
    history: (historyRes.data || []) as AdaptationHistoryEntry[],
    barriers: (barriersRes.data || []) as StudentBarrierRecord[],
  };
}

export function useStudentReportData(studentId: string) {
  return useQuery<StudentReportData>({
    queryKey: ["student-report", studentId],
    queryFn: () => fetchStudentReportData(studentId),
    enabled: studentId.length > 0,
    staleTime: 30_000,
  });
}

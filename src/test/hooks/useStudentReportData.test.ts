import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createTestWrapper } from "../helpers";

const historyRows = [
  {
    id: "h1",
    activity_type: "exercicio",
    created_at: "2026-03-14T10:00:00Z",
    barriers_used: [{ dimension: "tdah", barrier_key: "tdah_atencao_sustentada" }],
    adaptation_result: { strategies_applied: ["Fragmentação de enunciados"] },
    student_id: "student-001",
  },
  {
    id: "h2",
    activity_type: "avaliacao",
    created_at: "2026-04-01T10:00:00Z",
    barriers_used: [{ dimension: "dislexia", barrier_key: "dislexia_leitura" }],
    adaptation_result: { strategies_applied: ["Apoio visual"] },
    student_id: "student-001",
  },
];

const barrierRows = [
  { barrier_key: "tdah_atencao_sustentada", is_active: true, student_id: "student-001" },
  { barrier_key: "dislexia_leitura", is_active: true, student_id: "student-001" },
];

const makeChain = (data: unknown) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data, error: null }),
  then: (resolve: (v: { data: unknown; error: null }) => void) =>
    resolve({ data, error: null }),
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "adaptations_history") return makeChain(historyRows);
      if (table === "student_barriers") return makeChain(barrierRows);
      return makeChain([]);
    }),
  },
}));

import { useStudentReportData } from "@/hooks/useStudentReportData";

describe("useStudentReportData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns history and barriers for a student", async () => {
    const { result } = renderHook(() => useStudentReportData("student-001"), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.history).toHaveLength(2);
    expect(result.current.data?.barriers).toHaveLength(2);
  });

  it("is disabled when studentId is empty", () => {
    const { result } = renderHook(() => useStudentReportData(""), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

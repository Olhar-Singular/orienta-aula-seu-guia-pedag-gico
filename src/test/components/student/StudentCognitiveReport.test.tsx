import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createTestWrapper } from "../../helpers";

const makeChain = (data: unknown) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data, error: null }),
  then: (resolve: (v: { data: unknown; error: null }) => void) =>
    resolve({ data, error: null }),
});

const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import StudentCognitiveReport from "@/components/student/StudentCognitiveReport";

describe("StudentCognitiveReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty-state CTA when the student has no adaptations", async () => {
    fromMock.mockImplementation(() => makeChain([]));

    render(<StudentCognitiveReport studentId="student-001" />, {
      wrapper: createTestWrapper(),
    });

    await waitFor(() =>
      expect(screen.getByText(/ainda não há adaptações/i)).toBeInTheDocument()
    );
  });

  it("renders the main report blocks when data is present", async () => {
    const history = [
      {
        id: "h1",
        activity_type: "exercicio",
        created_at: "2026-03-14T10:00:00Z",
        barriers_used: [{ dimension: "tdah", barrier_key: "tdah_atencao_sustentada" }],
        adaptation_result: { strategies_applied: ["Fragmentação de enunciados"] },
      },
      {
        id: "h2",
        activity_type: "avaliacao",
        created_at: "2026-04-01T10:00:00Z",
        barriers_used: [{ dimension: "dislexia", barrier_key: "dislexia_leitura" }],
        adaptation_result: { strategies_applied: ["Apoio visual"] },
      },
    ];
    const barriers = [
      { barrier_key: "tdah_atencao_sustentada", is_active: true },
      { barrier_key: "dislexia_leitura", is_active: true },
    ];
    fromMock.mockImplementation((table: string) => {
      if (table === "adaptations_history") return makeChain(history);
      if (table === "student_barriers") return makeChain(barriers);
      return makeChain([]);
    });

    render(<StudentCognitiveReport studentId="student-001" />, {
      wrapper: createTestWrapper(),
    });

    await waitFor(() =>
      expect(screen.getByText(/barreiras mais frequentes/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/distribuição por tipo de atividade/i)).toBeInTheDocument();
    expect(screen.getByText(/estratégias mais aplicadas/i)).toBeInTheDocument();
    expect(screen.getByText(/barreiras por dimensão/i)).toBeInTheDocument();
  });
});

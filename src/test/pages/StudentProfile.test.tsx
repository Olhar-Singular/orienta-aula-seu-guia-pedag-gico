import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-001" }, session: null, loading: false }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const makeChain = (data: unknown) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data, error: null }),
  single: vi.fn().mockResolvedValue({ data, error: null }),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  then: (resolve: (v: { data: unknown; error: null }) => void) =>
    resolve({ data, error: null }),
});

const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import StudentProfile from "@/pages/StudentProfile";

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard/turmas/:id/alunos/:alunoId" element={<StudentProfile />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("StudentProfile — Relatório tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockImplementation((table: string) => {
      if (table === "class_students") {
        return makeChain({ id: "student-1", name: "João", notes: "", registration_code: null });
      }
      if (table === "student_barriers") {
        return makeChain([]);
      }
      if (table === "adaptations_history") {
        return makeChain([]);
      }
      return makeChain(null);
    });
  });

  it("exposes the Relatório tab that mounts the cognitive report", async () => {
    renderAt("/dashboard/turmas/class-1/alunos/student-1");

    const reportTab = await screen.findByRole("tab", { name: /relatório/i });
    expect(reportTab).toBeInTheDocument();
    expect(reportTab).toHaveAttribute(
      "aria-controls",
      expect.stringContaining("relatorio")
    );
  });
});

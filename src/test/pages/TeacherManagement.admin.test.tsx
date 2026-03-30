import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks ───

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" }, session: null, loading: false }),
}));

vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => ({
    schoolId: null, schoolName: null, memberRole: null,
    isLoading: false, hasSchool: false,
  }),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({
    role: "admin", isSuperAdmin: true, isGestor: false,
    isTeacher: false, isActive: true, isLoading: false,
  }),
}));

// Mock two separate tables: school_members (members) and profiles, schools
const mockSchoolsData = [
  { id: "s1", name: "Escola Alfa", code: "ALFA01" },
  { id: "s2", name: "Escola Beta", code: "BETA02" },
];

const mockMembersData = [
  { id: "m1", user_id: "u2", role: "teacher", joined_at: "2026-01-01", school_id: "s1" },
  { id: "m2", user_id: "u3", role: "gestor", joined_at: "2026-01-02", school_id: "s2" },
];

const mockProfilesData = [
  { user_id: "u2", full_name: "Ana Lima", name: "Ana Lima", email: "ana@escola.com" },
  { user_id: "u3", full_name: "Carlos Souza", name: "Carlos Souza", email: "carlos@escola.com" },
];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      const methods = ["select", "eq", "in", "order", "neq"];
      methods.forEach((m) => { chain[m] = vi.fn(() => chain); });

      if (table === "schools") {
        chain["order"] = vi.fn(() =>
          Promise.resolve({ data: mockSchoolsData, error: null })
        );
      } else if (table === "school_members") {
        chain["order"] = vi.fn(() =>
          Promise.resolve({ data: mockMembersData, error: null })
        );
      } else if (table === "profiles") {
        chain["in"] = vi.fn(() =>
          Promise.resolve({ data: mockProfilesData, error: null })
        );
      }
      return chain;
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import TeacherManagement from "@/pages/admin/TeacherManagement";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TeacherManagement />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("TeacherManagement — admin mode (super-admin)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exibe dropdown de filtro de escola", () => {
    renderPage();
    expect(screen.getByTestId("school-filter")).toBeTruthy();
  });

  it("dropdown lista todas as escolas", async () => {
    renderPage();
    await waitFor(() => {
      const select = screen.getByTestId("school-filter");
      expect(select.innerHTML).toContain("Escola Alfa");
      expect(select.innerHTML).toContain("Escola Beta");
    });
  });

  it("exibe coluna 'Escola' na tabela quando admin", async () => {
    renderPage();
    // Table header should have "Escola" column
    await waitFor(() => {
      const headers = screen.getAllByRole("columnheader");
      const headerTexts = headers.map((h) => h.textContent);
      expect(headerTexts.some((t) => t?.includes("Escola"))).toBe(true);
    });
  });
});

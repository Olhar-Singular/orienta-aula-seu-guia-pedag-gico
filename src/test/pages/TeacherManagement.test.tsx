import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks ───

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" }, session: null, loading: false }),
}));

const mockUseUserSchool = vi.fn();
vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => mockUseUserSchool(),
}));

const mockUseUserRole = vi.fn();
vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => mockUseUserRole(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((cb: (v: { data: never[]; error: null }) => void) => cb({ data: [], error: null })),
    })),
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

describe("TeacherManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUserSchool.mockReturnValue({
      schoolId: "school-001",
      schoolName: "Escola Teste",
      memberRole: "gestor",
      isLoading: false,
      hasSchool: true,
    });
    mockUseUserRole.mockReturnValue({
      role: "gestor", isSuperAdmin: false, isGestor: true,
      isTeacher: false, isActive: true, isLoading: false,
    });
  });

  describe("gestor mode", () => {
    it("renders page title", () => {
      renderPage();
      expect(screen.getByText("Gestão de Professores")).toBeTruthy();
    });

    it("shows 'Gestor' label (not 'Admin') in role radio in add form", async () => {
      renderPage();
      const addButton = screen.getByRole("button", { name: /Adicionar/i });
      addButton.click();

      // After clicking add, dialog opens — check role options
      await new Promise((r) => setTimeout(r, 50));
      const gestorLabel = document.querySelector('[for="role-gestor"]') ||
        screen.queryByText("Gestor");
      const adminLabel = screen.queryByText("Administrador");

      expect(gestorLabel).toBeTruthy();
      expect(adminLabel).toBeFalsy();
    });

    it("does NOT show toggle-active button for teacher rows", () => {
      renderPage();
      // No activate/deactivate buttons visible for gestor
      expect(screen.queryByTitle("Desativar")).not.toBeInTheDocument();
      expect(screen.queryByTitle("Ativar")).not.toBeInTheDocument();
    });

    it("shows error when no school linked", () => {
      mockUseUserSchool.mockReturnValue({
        schoolId: null, schoolName: null, memberRole: null,
        isLoading: false, hasSchool: false,
      });
      renderPage();
      expect(screen.getByText(/Você precisa estar vinculado/)).toBeTruthy();
    });
  });

  describe("admin (super-admin) mode", () => {
    beforeEach(() => {
      mockUseUserRole.mockReturnValue({
        role: "admin", isSuperAdmin: true, isGestor: false,
        isTeacher: false, isActive: true, isLoading: false,
      });
      mockUseUserSchool.mockReturnValue({
        schoolId: null, schoolName: null, memberRole: null,
        isLoading: false, hasSchool: false,
      });
    });

    it("renders page without requiring school link", () => {
      renderPage();
      expect(screen.getByText("Gestão de Professores")).toBeTruthy();
    });

    it("does NOT show 'Você precisa estar vinculado' error for super-admin", () => {
      renderPage();
      expect(screen.queryByText(/Você precisa estar vinculado/)).not.toBeInTheDocument();
    });
  });
});

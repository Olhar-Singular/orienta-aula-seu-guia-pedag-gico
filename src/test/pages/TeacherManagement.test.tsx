import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const mockInvoke = vi.mocked(supabase.functions.invoke);

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

function gestorDefaults() {
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
}

describe("TeacherManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gestorDefaults();
  });

  describe("gestor mode", () => {
    it("renders page title", () => {
      renderPage();
      expect(screen.getByText("Gestão de Professores")).toBeTruthy();
    });

    it("shows 'Gestor' label in add form role options", async () => {
      renderPage();
      const addButton = screen.getByRole("button", { name: /Adicionar/i });
      addButton.click();

      await new Promise((r) => setTimeout(r, 50));
      const gestorLabel = document.querySelector('[for="role-gestor"]') ||
        screen.queryByText("Gestor");
      const adminLabel = screen.queryByText("Administrador");

      expect(gestorLabel).toBeTruthy();
      expect(adminLabel).toBeFalsy();
    });

    it("does NOT show toggle-active button for teacher rows", () => {
      renderPage();
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

  describe("Add teacher dialog", () => {
    it("opens dialog when Adicionar button is clicked", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Adicionar/i }));
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("shows toast error when required fields are missing", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Adicionar/i }));
      await waitFor(() => screen.getByRole("dialog"));
      const dialogAddBtn = screen.getAllByRole("button", { name: /Adicionar/i }).find(
        (btn) => btn.closest("[role='dialog']")
      );
      fireEvent.click(dialogAddBtn!);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Nome, e-mail e senha são obrigatórios.");
      });
    });

    it("shows toast error when password is less than 6 characters", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Adicionar/i }));
      await waitFor(() => screen.getByRole("dialog"));

      fireEvent.change(screen.getByLabelText(/Nome completo/i), { target: { value: "Maria Silva" } });
      fireEvent.change(screen.getByLabelText(/E-mail \*/i), { target: { value: "maria@escola.com" } });
      fireEvent.change(screen.getByLabelText(/Senha \*/i), { target: { value: "abc" } });

      const dialogAddBtn = screen.getAllByRole("button", { name: /Adicionar/i }).find(
        (btn) => btn.closest("[role='dialog']")
      );
      fireEvent.click(dialogAddBtn!);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("A senha deve ter pelo menos 6 caracteres.");
      });
    });

    it("resets form when dialog is closed without submitting", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Adicionar/i }));
      await waitFor(() => screen.getByRole("dialog"));

      fireEvent.change(screen.getByLabelText(/Nome completo/i), { target: { value: "Maria Silva" } });

      fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

      fireEvent.click(screen.getByRole("button", { name: /Adicionar/i }));
      await waitFor(() => screen.getByRole("dialog"));

      expect(screen.getByLabelText(/Nome completo/i)).toHaveValue("");
    });

    it("resets showPassword state when dialog is closed", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Adicionar/i }));
      await waitFor(() => screen.getByRole("dialog"));

      const passwordInput = screen.getByLabelText(/Senha \*/i);
      expect(passwordInput).toHaveAttribute("type", "password");

      // Toggle show password (eye button inside dialog)
      const eyeBtns = screen.getAllByRole("button");
      const eyeBtn = eyeBtns.find((b) => b.querySelector("svg") && b.closest("[role='dialog']") && !b.textContent?.trim());
      if (eyeBtn) fireEvent.click(eyeBtn);

      // Close dialog
      fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

      // Reopen
      fireEvent.click(screen.getByRole("button", { name: /Adicionar/i }));
      await waitFor(() => screen.getByRole("dialog"));
      expect(screen.getByLabelText(/Senha \*/i)).toHaveAttribute("type", "password");
    });

    it("calls invoke with correct payload on successful add", async () => {
      mockInvoke.mockResolvedValue({ data: { success: true, is_existing_user: false }, error: null });
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Adicionar/i }));
      await waitFor(() => screen.getByRole("dialog"));

      fireEvent.change(screen.getByLabelText(/Nome completo/i), { target: { value: "Maria Silva" } });
      fireEvent.change(screen.getByLabelText(/E-mail \*/i), { target: { value: "maria@escola.com" } });
      fireEvent.change(screen.getByLabelText(/Senha \*/i), { target: { value: "senha123" } });

      const dialogAddBtn = screen.getAllByRole("button", { name: /Adicionar/i }).find(
        (btn) => btn.closest("[role='dialog']")
      );
      fireEvent.click(dialogAddBtn!);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("admin-manage-teachers", {
          body: expect.objectContaining({
            action: "create",
            email: "maria@escola.com",
            name: "Maria Silva",
            password: "senha123",
            school_id: "school-001",
            role: "teacher",
          }),
        });
      });
    });

    it("shows toast error when add fails", async () => {
      mockInvoke.mockResolvedValue({ data: { error: "Email já cadastrado" }, error: null });
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Adicionar/i }));
      await waitFor(() => screen.getByRole("dialog"));

      fireEvent.change(screen.getByLabelText(/Nome completo/i), { target: { value: "Maria Silva" } });
      fireEvent.change(screen.getByLabelText(/E-mail \*/i), { target: { value: "maria@escola.com" } });
      fireEvent.change(screen.getByLabelText(/Senha \*/i), { target: { value: "senha123" } });

      const dialogAddBtn = screen.getAllByRole("button", { name: /Adicionar/i }).find(
        (btn) => btn.closest("[role='dialog']")
      );
      fireEvent.click(dialogAddBtn!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Email já cadastrado");
      });
    });
  });

  describe("CSV import", () => {
    function makeFileWithText(content: string, name = "teachers.csv") {
      const file = new File([content], name, { type: "text/csv" });
      // jsdom doesn't implement File.prototype.text — polyfill it
      Object.defineProperty(file, "text", {
        value: () => Promise.resolve(content),
      });
      return file;
    }

    it("shows error when CSV has no valid Nome/E-mail headers", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Importar/i }));
      await waitFor(() => screen.getByRole("dialog"));

      const file = makeFileWithText("Codigo,Telefone\n123,99999999\n");
      const input = screen.getByRole("dialog").querySelector("input[type='file']")!;
      fireEvent.change(input, { target: { files: [file] } });

      fireEvent.click(screen.getByRole("button", { name: /Importar/i }));
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Planilha deve conter colunas 'Nome' e 'E-mail'."
        );
      });
    });

    it("calls invoke with parsed teacher list on valid CSV", async () => {
      mockInvoke.mockResolvedValue({ data: { succeeded: 2, failed: 0 }, error: null });
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Importar/i }));
      await waitFor(() => screen.getByRole("dialog"));

      const csvContent = "Nome,E-mail,Cargo\nMaria Silva,maria@escola.com,prof\nJoao Santos,joao@escola.com,gestor\n";
      const file = makeFileWithText(csvContent);
      const input = screen.getByRole("dialog").querySelector("input[type='file']")!;
      fireEvent.change(input, { target: { files: [file] } });

      fireEvent.click(screen.getByRole("button", { name: /Importar/i }));
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("admin-manage-teachers", {
          body: expect.objectContaining({
            action: "import",
            teachers: [
              { name: "Maria Silva", email: "maria@escola.com", role: "teacher" },
              { name: "Joao Santos", email: "joao@escola.com", role: "gestor" },
            ],
          }),
        });
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks ───

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" }, session: null, loading: false }),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({
    role: "admin", isSuperAdmin: true, isGestor: false,
    isTeacher: false, isActive: true, isLoading: false,
  }),
}));

const mockCreateSchool = vi.fn();
const mockUpdateSchool = vi.fn();
const mockDeleteSchool = vi.fn();
const mockUseSchoolManagement = vi.fn();

vi.mock("@/hooks/useSchoolManagement", () => ({
  useSchoolManagement: () => mockUseSchoolManagement(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import SchoolManagement from "@/pages/admin/SchoolManagement";
import { toast } from "sonner";

const DEFAULT_SCHOOLS = [
  { id: "s1", name: "Escola Alfa", code: "ALFA01", member_count: 5 },
  { id: "s2", name: "Escola Beta", code: "BETA02", member_count: 3 },
];

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SchoolManagement />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("SchoolManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSchool.mockImplementation((_vars: any, opts: any) => opts?.onSuccess?.());
    mockUpdateSchool.mockImplementation((_vars: any, opts: any) => opts?.onSuccess?.());
    mockDeleteSchool.mockImplementation((_vars: any, opts: any) => opts?.onSettled?.());
    mockUseSchoolManagement.mockReturnValue({
      schools: DEFAULT_SCHOOLS,
      isLoading: false,
      createSchool: mockCreateSchool,
      updateSchool: mockUpdateSchool,
      deleteSchool: mockDeleteSchool,
    });
  });

  it("renders page title", () => {
    renderPage();
    expect(screen.getByText("Gestão de Escolas")).toBeTruthy();
  });

  it("renders list of schools", () => {
    renderPage();
    expect(screen.getByText("Escola Alfa")).toBeTruthy();
    expect(screen.getByText("Escola Beta")).toBeTruthy();
  });

  it("shows school code", () => {
    renderPage();
    expect(screen.getByText("ALFA01")).toBeTruthy();
    expect(screen.getByText("BETA02")).toBeTruthy();
  });

  it("shows member count", () => {
    renderPage();
    expect(screen.getByText(/5/)).toBeTruthy();
    expect(screen.getByText(/3/)).toBeTruthy();
  });

  it("renders Add School button", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /Nova Escola/i })).toBeTruthy();
  });

  it("shows loading state", () => {
    mockUseSchoolManagement.mockReturnValue({
      schools: [], isLoading: true,
      createSchool: vi.fn(), updateSchool: vi.fn(), deleteSchool: vi.fn(),
    });
    const { container } = renderPage();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("shows empty state message", () => {
    mockUseSchoolManagement.mockReturnValue({
      schools: [], isLoading: false,
      createSchool: vi.fn(), updateSchool: vi.fn(), deleteSchool: vi.fn(),
    });
    renderPage();
    expect(screen.getByText("Nenhuma escola cadastrada.")).toBeTruthy();
  });

  describe("Create school dialog", () => {
    it("opens dialog when Nova Escola is clicked", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Nova Escola/i }));
      await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    });

    it("calls createSchool with name and generated code", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Nova Escola/i }));
      await waitFor(() => screen.getByRole("dialog"));

      fireEvent.change(screen.getByLabelText(/Nome da escola \*/i), {
        target: { value: "Escola Nova" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^Criar$/i }));

      await waitFor(() => {
        expect(mockCreateSchool).toHaveBeenCalledWith(
          expect.objectContaining({ name: "Escola Nova", code: expect.any(String) }),
          expect.any(Object)
        );
      });
    });

    it("closes dialog after successful create", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Nova Escola/i }));
      await waitFor(() => screen.getByRole("dialog"));

      fireEvent.change(screen.getByLabelText(/Nome da escola \*/i), {
        target: { value: "Escola Nova" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^Criar$/i }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("keeps dialog open when create fails", async () => {
      mockCreateSchool.mockImplementation((_vars: any, opts: any) => opts?.onError?.(new Error("Erro ao criar")));
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Nova Escola/i }));
      await waitFor(() => screen.getByRole("dialog"));

      fireEvent.change(screen.getByLabelText(/Nome da escola \*/i), {
        target: { value: "Escola Nova" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^Criar$/i }));

      await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    });
  });

  describe("Edit school dialog", () => {
    it("opens edit dialog with pre-filled name", async () => {
      renderPage();
      const editBtns = screen.getAllByTitle("Editar");
      fireEvent.click(editBtns[0]);
      await waitFor(() => screen.getByRole("dialog"));

      expect(screen.getByLabelText(/Nome da escola/i)).toHaveValue("Escola Alfa");
    });

    it("calls updateSchool with correct id and name", async () => {
      renderPage();
      fireEvent.click(screen.getAllByTitle("Editar")[0]);
      await waitFor(() => screen.getByRole("dialog"));

      fireEvent.change(screen.getByLabelText(/Nome da escola/i), {
        target: { value: "Escola Alfa Editada" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^Salvar$/i }));

      await waitFor(() => {
        expect(mockUpdateSchool).toHaveBeenCalledWith(
          { school_id: "s1", name: "Escola Alfa Editada" },
          expect.any(Object)
        );
      });
    });

    it("closes dialog after successful edit", async () => {
      renderPage();
      fireEvent.click(screen.getAllByTitle("Editar")[0]);
      await waitFor(() => screen.getByRole("dialog"));

      fireEvent.change(screen.getByLabelText(/Nome da escola/i), {
        target: { value: "Novo Nome" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^Salvar$/i }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("keeps dialog open when edit fails", async () => {
      mockUpdateSchool.mockImplementation((_vars: any, opts: any) => opts?.onError?.(new Error("Erro")));
      renderPage();
      fireEvent.click(screen.getAllByTitle("Editar")[0]);
      await waitFor(() => screen.getByRole("dialog"));

      fireEvent.change(screen.getByLabelText(/Nome da escola/i), {
        target: { value: "Nome Editado" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^Salvar$/i }));

      await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    });
  });

  describe("Delete school", () => {
    it("opens delete confirmation with school name", async () => {
      renderPage();
      fireEvent.click(screen.getAllByTitle("Excluir")[0]);
      await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument());
      expect(screen.getByRole("alertdialog").textContent).toContain("Escola Alfa");
    });

    it("calls deleteSchool with correct school_id", async () => {
      renderPage();
      fireEvent.click(screen.getAllByTitle("Excluir")[0]);
      await waitFor(() => screen.getByRole("alertdialog"));

      fireEvent.click(screen.getByRole("button", { name: /Excluir/i }));

      await waitFor(() => {
        expect(mockDeleteSchool).toHaveBeenCalledWith(
          { school_id: "s1" },
          expect.any(Object)
        );
      });
    });
  });
});

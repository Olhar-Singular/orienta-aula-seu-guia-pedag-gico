import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks ───

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-001" }, session: null, loading: false }),
}));

vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => ({
    schoolId: "school-001",
    schoolName: "Escola Teste",
    schoolCode: "TESTE01",
    memberRole: "teacher",
    isLoading: false,
    hasSchool: true,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Supabase mock with fine-grained per-table control
const mockClassesDelete = vi.fn();
const mockCountStudents = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "classes") {
        return {
          select: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  { id: "class-1", name: "5º Ano A", description: null, school_year: "2026", class_students: [{ count: 0 }] },
                  { id: "class-2", name: "6º Ano B", description: null, school_year: "2026", class_students: [{ count: 3 }] },
                ],
                error: null,
              }),
          }),
          insert: vi.fn(),
          delete: () => ({
            eq: (_col: string, id: string) => {
              mockClassesDelete(id);
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      if (table === "class_students") {
        return {
          select: (_cols: string, _opts: any) => ({
            eq: (_col: string, classId: string) => {
              return Promise.resolve(mockCountStudents(classId));
            },
          }),
        };
      }
      return {};
    },
  },
}));

// ─── Imports (after mocks) ───
import Classes from "@/pages/Classes";
import { toast } from "sonner";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Classes />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Classes — modal de confirmação de exclusão", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no students in any class
    mockCountStudents.mockReturnValue({ count: 0, error: null });
  });

  it("clicar na lixeira NÃO exclui imediatamente", async () => {
    renderPage();
    await waitFor(() => screen.getByText("5º Ano A"));

    const deleteBtns = screen.getAllByRole("button", { name: /excluir turma/i });
    fireEvent.click(deleteBtns[0]);

    // Small wait for async count check to resolve
    await waitFor(() => expect(mockCountStudents).toHaveBeenCalledWith("class-1"));

    expect(mockClassesDelete).not.toHaveBeenCalled();
  });

  it("turma sem alunos abre modal de confirmação com o nome da turma", async () => {
    renderPage();
    await waitFor(() => screen.getByText("5º Ano A"));

    fireEvent.click(screen.getAllByRole("button", { name: /excluir turma/i })[0]);

    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument());
    expect(screen.getByRole("alertdialog").textContent).toContain("5º Ano A");
    expect(screen.getByRole("alertdialog").textContent?.toLowerCase()).toContain("irreversível");
  });

  it("turma COM alunos mostra toast de erro e NÃO abre modal", async () => {
    mockCountStudents.mockImplementation((classId: string) =>
      classId === "class-2" ? { count: 3, error: null } : { count: 0, error: null }
    );

    renderPage();
    await waitFor(() => screen.getByText("6º Ano B"));

    // Second card (6º Ano B) has 3 students
    fireEvent.click(screen.getAllByRole("button", { name: /excluir turma/i })[1]);

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mockClassesDelete).not.toHaveBeenCalled();
  });

  it("botão Cancelar fecha o modal sem excluir", async () => {
    renderPage();
    await waitFor(() => screen.getByText("5º Ano A"));

    fireEvent.click(screen.getAllByRole("button", { name: /excluir turma/i })[0]);
    await waitFor(() => screen.getByRole("alertdialog"));

    fireEvent.click(screen.getByRole("button", { name: /^cancelar$/i }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(mockClassesDelete).not.toHaveBeenCalled();
  });

  it("botão Excluir confirma e chama delete com o id da turma", async () => {
    renderPage();
    await waitFor(() => screen.getByText("5º Ano A"));

    fireEvent.click(screen.getAllByRole("button", { name: /excluir turma/i })[0]);
    await waitFor(() => screen.getByRole("alertdialog"));

    // Within the alertdialog, click the confirm button
    const dialog = screen.getByRole("alertdialog");
    const confirmBtn = Array.from(dialog.querySelectorAll("button")).find(
      (b) => /excluir/i.test(b.textContent || "") && !/cancelar/i.test(b.textContent || "")
    );
    expect(confirmBtn).toBeTruthy();
    fireEvent.click(confirmBtn!);

    await waitFor(() => expect(mockClassesDelete).toHaveBeenCalledWith("class-1"));
  });
});

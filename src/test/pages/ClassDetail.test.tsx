import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ─── Mocks ───

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-001" }, session: null, loading: false }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockStudentsDelete = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "classes") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: "class-1", name: "5º Ano A", description: null, school_year: "2026" },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "class_students") {
        return {
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    { id: "student-1", name: "João Pedro", registration_code: "JP001", class_id: "class-1" },
                    { id: "student-2", name: "Maria Clara", registration_code: null, class_id: "class-1" },
                  ],
                  error: null,
                }),
            }),
          }),
          insert: vi.fn(),
          delete: () => ({
            eq: (_col: string, id: string) => {
              mockStudentsDelete(id);
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      return {};
    },
  },
}));

// ─── Imports (after mocks) ───
import ClassDetail from "@/pages/ClassDetail";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/dashboard/turmas/class-1"]}>
        <Routes>
          <Route path="/dashboard/turmas/:id" element={<ClassDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ClassDetail — modal de confirmação de exclusão de aluno", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clicar na lixeira NÃO exclui aluno imediatamente", async () => {
    renderPage();
    await waitFor(() => screen.getByText("João Pedro"));

    fireEvent.click(screen.getAllByRole("button", { name: /excluir aluno/i })[0]);

    // Brief wait to ensure no immediate delete
    await new Promise((r) => setTimeout(r, 10));
    expect(mockStudentsDelete).not.toHaveBeenCalled();
  });

  it("abre modal de confirmação com o nome do aluno", async () => {
    renderPage();
    await waitFor(() => screen.getByText("João Pedro"));

    fireEvent.click(screen.getAllByRole("button", { name: /excluir aluno/i })[0]);

    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument());
    const dialogText = screen.getByRole("alertdialog").textContent?.toLowerCase() ?? "";
    expect(screen.getByRole("alertdialog").textContent).toContain("João Pedro");
    expect(dialogText).toContain("irreversível");
  });

  it("botão Cancelar fecha o modal sem excluir", async () => {
    renderPage();
    await waitFor(() => screen.getByText("João Pedro"));

    fireEvent.click(screen.getAllByRole("button", { name: /excluir aluno/i })[0]);
    await waitFor(() => screen.getByRole("alertdialog"));

    fireEvent.click(screen.getByRole("button", { name: /^cancelar$/i }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(mockStudentsDelete).not.toHaveBeenCalled();
  });

  it("botão Excluir confirma e chama delete em class_students com o id correto", async () => {
    renderPage();
    await waitFor(() => screen.getByText("João Pedro"));

    fireEvent.click(screen.getAllByRole("button", { name: /excluir aluno/i })[0]);
    await waitFor(() => screen.getByRole("alertdialog"));

    const dialog = screen.getByRole("alertdialog");
    const confirmBtn = Array.from(dialog.querySelectorAll("button")).find(
      (b) => /excluir/i.test(b.textContent || "") && !/cancelar/i.test(b.textContent || "")
    );
    expect(confirmBtn).toBeTruthy();
    fireEvent.click(confirmBtn!);

    await waitFor(() => expect(mockStudentsDelete).toHaveBeenCalledWith("student-1"));
  });
});

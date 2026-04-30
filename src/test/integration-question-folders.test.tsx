/**
 * Integration Test: Banco de Questões — fluxo de navegação em pastas
 * séries → matérias → questões → voltar + busca global
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestWrapper } from "./helpers";

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    // @ts-ignore jsdom stub
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.scrollIntoView) {
    // @ts-ignore jsdom stub
    Element.prototype.scrollIntoView = () => {};
  }
});

const { mockRpc, mockFrom } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "teste@teste.com" },
    session: null,
    loading: false,
  }),
}));

vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => ({ schoolId: "school-1", loading: false }),
}));

import QuestionBankFolderView from "@/components/question-bank/QuestionBankFolderView";

function chain(data: any) {
  const c: any = {
    select: vi.fn(() => c),
    eq: vi.fn(() => c),
    is: vi.fn(() => c),
    or: vi.fn(() => c),
    order: vi.fn(() => c),
    limit: vi.fn(() => c),
    then: vi.fn((resolve: any) => resolve({ data, error: null })),
  };
  return c;
}

describe("QuestionBankFolderView — fluxo de navegação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza grid de séries na raiz", async () => {
    mockRpc.mockResolvedValue({
      data: [
        { folder_key: "9º ano", folder_count: 5, last_at: "2026-04-01T00:00:00Z" },
        { folder_key: "1º ano", folder_count: 3, last_at: "2026-03-01T00:00:00Z" },
      ],
      error: null,
    });
    mockFrom.mockImplementation(() => chain([]));

    const Wrapper = createTestWrapper();
    render(<QuestionBankFolderView />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("9º ano")).toBeTruthy();
    });
    expect(screen.getByText("1º ano")).toBeTruthy();
    // breadcrumb raiz
    expect(screen.getByText("Banco")).toBeTruthy();
  });

  it("navega para nível de matérias ao clicar em uma série", async () => {
    // primeira chamada: grades
    mockRpc.mockImplementation(async (_name, args: any) => {
      if (args.p_level === "grade") {
        return {
          data: [{ folder_key: "9º ano", folder_count: 5, last_at: "2026-04-01" }],
          error: null,
        };
      }
      return {
        data: [{ folder_key: "Matemática", folder_count: 3, last_at: "2026-04-01" }],
        error: null,
      };
    });
    mockFrom.mockImplementation(() => chain([]));

    const user = userEvent.setup();
    const Wrapper = createTestWrapper();
    render(<QuestionBankFolderView />, { wrapper: Wrapper });

    await screen.findByText("9º ano");
    await user.click(screen.getByRole("button", { name: /Abrir pasta 9º ano/ }));
    await screen.findByText("Matemática");
    // breadcrumb: Banco > 9º ano
    expect(screen.getAllByText("9º ano").length).toBeGreaterThan(0);
  });

  it("'Sem série' é rotulado quando RPC retorna folder_key null", async () => {
    mockRpc.mockResolvedValue({
      data: [{ folder_key: null, folder_count: 2, last_at: "2026-04-01" }],
      error: null,
    });
    mockFrom.mockImplementation(() => chain([]));

    const Wrapper = createTestWrapper();
    render(<QuestionBankFolderView />, { wrapper: Wrapper });

    await screen.findByText("Sem série");
  });

  it("breadcrumb Banco leva de volta à raiz", async () => {
    mockRpc.mockImplementation(async (_n, args: any) => {
      if (args.p_level === "grade") {
        return {
          data: [{ folder_key: "9º ano", folder_count: 5, last_at: "2026-04-01" }],
          error: null,
        };
      }
      return {
        data: [{ folder_key: "Matemática", folder_count: 3, last_at: "2026-04-01" }],
        error: null,
      };
    });
    mockFrom.mockImplementation(() => chain([]));

    const user = userEvent.setup();
    const Wrapper = createTestWrapper();
    render(<QuestionBankFolderView />, { wrapper: Wrapper });

    await screen.findByText("9º ano");
    await user.click(screen.getByRole("button", { name: /Abrir pasta 9º ano/ }));
    await screen.findByText("Matemática");

    // Clica "Banco" no breadcrumb
    await user.click(screen.getByRole("button", { name: /Banco/ }));
    await waitFor(() => expect(screen.queryByText("Matemática")).toBeNull());
    await screen.findByText("9º ano");
  });

  it("busca global exibe resultados agrupados", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "question_bank") {
        return chain([
          {
            id: "q1",
            text: "Calcule a integral",
            subject: "Matemática",
            grade: "9º ano",
            topic: null,
            difficulty: "medio",
            options: null,
            correct_answer: null,
            resolution: null,
            image_url: null,
            source: "manual",
            source_file_name: null,
            is_public: false,
            created_at: "2026-04-01",
          },
        ]);
      }
      return chain([]);
    });

    const user = userEvent.setup();
    const Wrapper = createTestWrapper();
    render(<QuestionBankFolderView />, { wrapper: Wrapper });

    const searchInput = screen.getByPlaceholderText(/banco todo/);
    await user.type(searchInput, "integral{Enter}");

    await waitFor(() => expect(screen.getByText("9º ano · Matemática")).toBeTruthy());
  });
});

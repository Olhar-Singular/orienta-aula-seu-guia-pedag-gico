/**
 * Tests for QuestionBank page — file validation, upload flow, and AI extraction.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createTestWrapper } from "../helpers";

const {
  mockFrom,
  mockStorageUpload,
  mockRpc,
  STABLE_USER,
  STABLE_SCHOOL,
} = vi.hoisted(() => {
  const STABLE_USER = {
    id: "user-001",
    email: "teste@escola.com",
    user_metadata: { name: "Prof Teste" },
  };
  const STABLE_SCHOOL = {
    schoolId: "school-001",
    schoolName: "Escola Teste",
    schoolCode: "E001",
    memberRole: "teacher",
    isLoading: false,
    hasSchool: true,
  };
  return {
    mockFrom: vi.fn(),
    mockStorageUpload: vi.fn(),
    mockRpc: vi.fn(),
    STABLE_USER,
    STABLE_SCHOOL,
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: STABLE_USER,
    session: { access_token: "tok", refresh_token: "ref", user: STABLE_USER },
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => STABLE_SCHOOL,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    storage: {
      from: () => ({
        upload: mockStorageUpload,
        getPublicUrl: () => ({ data: { publicUrl: "https://example.com/img.png" } }),
        download: vi.fn().mockResolvedValue({ data: null, error: new Error("not found") }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: { access_token: "tok" } } }),
      ),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock("@/lib/pdf-utils", () => ({
  parsePdf: vi.fn(async () => ({ text: "Texto extraído do PDF", pageImages: [] })),
}));

vi.mock("@/lib/docx-utils", () => ({
  extractDocxText: vi.fn(async () => ""),
  extractDocxWithImages: vi.fn(async () => ({ text: "", images: [] })),
}));

import QuestionBank from "@/pages/QuestionBank";

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildEmptyChain() {
  const c: any = {
    select: vi.fn(() => c),
    insert: vi.fn(() => c),
    update: vi.fn(() => c),
    delete: vi.fn(() => c),
    upsert: vi.fn(() => c),
    eq: vi.fn(() => c),
    is: vi.fn(() => c),
    or: vi.fn(() => c),
    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    limit: vi.fn(() => c),
    then: vi.fn((resolve: any) => resolve({ data: [], error: null })),
  };
  return c;
}

function createFileWithMagicBytes(
  name: string,
  bytes: Uint8Array,
  mimeType: string,
  overrideSize?: number,
): File {
  const file = new File([bytes], name, { type: mimeType });

  if (overrideSize !== undefined) {
    Object.defineProperty(file, "size", { get: () => overrideSize, configurable: true });
  }

  // Patch arrayBuffer so file.slice(0,4).arrayBuffer() returns the bytes
  const origSlice = file.slice.bind(file);
  (file as any).slice = (...args: any[]) => {
    const start = (args[0] ?? 0) as number;
    const end = (args[1] ?? bytes.length) as number;
    const sliced = origSlice(...args);
    (sliced as any).arrayBuffer = async () => bytes.slice(start, end).buffer.slice(0);
    return sliced;
  };
  (file as any).arrayBuffer = async () => bytes.buffer.slice(0);

  return file;
}

function createPdfFile(name = "prova.pdf"): File {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
  return createFileWithMagicBytes(name, bytes, "application/pdf");
}

function createInvalidFile(name = "invalid.txt"): File {
  const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
  return createFileWithMagicBytes(name, bytes, "text/plain");
}

function createOversizedPdfFile(name = "giant.pdf"): File {
  // Real bytes are small but we override the size property to simulate >10MB
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
  return createFileWithMagicBytes(name, bytes, "application/pdf", 11 * 1024 * 1024);
}

// ─── Setup ─────────────────────────────────────────────────────────────────

beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    // @ts-expect-error jsdom stub
    Element.prototype.scrollIntoView = () => {};
  }
  if (!Element.prototype.hasPointerCapture) {
    // @ts-expect-error jsdom stub
    Element.prototype.hasPointerCapture = () => false;
  }
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("QuestionBank — renderização básica", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageUpload.mockResolvedValue({ data: { path: "x" }, error: null });
    mockRpc.mockResolvedValue({ data: [], error: null });
    mockFrom.mockImplementation(() => buildEmptyChain());
  });

  afterEach(() => vi.restoreAllMocks());

  it("renderiza o título 'Banco de Questões'", async () => {
    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    expect(screen.getByText("Banco de Questões")).toBeTruthy();
  });

  it("renderiza a aba 'Provas' ativa por padrão", async () => {
    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    expect(screen.getByText("Provas")).toBeTruthy();
    expect(screen.getByText("Questões")).toBeTruthy();
  });

  it("mostra 'Nenhuma prova enviada' quando histórico está vazio", async () => {
    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Nenhuma prova enviada/)).toBeTruthy();
    });
  });
});

describe("QuestionBank — validação de upload de arquivo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageUpload.mockResolvedValue({ data: { path: "x" }, error: null });
    mockRpc.mockResolvedValue({ data: [], error: null });
    mockFrom.mockImplementation(() => buildEmptyChain());
  });

  afterEach(() => vi.restoreAllMocks());

  it("NÃO faz upload para storage quando arquivo é maior que 10MB", async () => {
    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText(/Nenhuma prova enviada/)).toBeTruthy());

    const file = createOversizedPdfFile();
    const input = document.querySelector<HTMLInputElement>("input[type=file]");
    fireEvent.change(input!, { target: { files: [file] } });

    // Aguarda um ciclo para o handler async terminar
    await new Promise((r) => setTimeout(r, 50));

    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it("NÃO faz upload para storage quando arquivo tem tipo inválido (não PDF/DOCX)", async () => {
    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText(/Nenhuma prova enviada/)).toBeTruthy());

    const file = createInvalidFile();
    const input = document.querySelector<HTMLInputElement>("input[type=file]");
    fireEvent.change(input!, { target: { files: [file] } });

    await new Promise((r) => setTimeout(r, 100));

    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it("faz upload para storage quando arquivo PDF é válido", async () => {
    const insertMock = vi.fn(() => ({
      then: (r: any) => r({ data: null, error: null }),
    }));
    mockFrom.mockImplementation((table: string) => {
      const chain = buildEmptyChain();
      if (table === "pdf_uploads") {
        chain.insert = insertMock;
      }
      return chain;
    });

    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText(/Nenhuma prova enviada/)).toBeTruthy());

    const file = createPdfFile("aula.pdf");
    const input = document.querySelector<HTMLInputElement>("input[type=file]");
    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockStorageUpload).toHaveBeenCalled();
    });
  });

  it("exibe o botão 'Extrair com IA' após arquivo ser carregado com sucesso", async () => {
    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText(/Nenhuma prova enviada/)).toBeTruthy());

    const file = createPdfFile("aula.pdf");
    const input = document.querySelector<HTMLInputElement>("input[type=file]");
    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Extrair com IA")).toBeTruthy();
    });
  });
});

describe("QuestionBank — fluxo de extração com IA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageUpload.mockResolvedValue({ data: { path: "x" }, error: null });
    mockRpc.mockResolvedValue({ data: [], error: null });
    mockFrom.mockImplementation(() => buildEmptyChain());
  });

  afterEach(() => vi.restoreAllMocks());

  it("exibe modal de revisão após extração bem-sucedida", async () => {
    // Mock fetch para o endpoint de extração
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("extract-questions")) {
        return {
          ok: true,
          json: async () => ({
            questions: [
              { text: "Calcule 2 + 2.", subject: "Matemática", has_figure: false },
              { text: "Qual a capital do Brasil?", subject: "Geografia", has_figure: false },
            ],
          }),
        };
      }
      return { ok: false, json: async () => ({ error: "Not found" }) };
    });
    globalThis.fetch = fetchMock as any;

    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText(/Nenhuma prova enviada/)).toBeTruthy());

    // Upload do arquivo
    const file = createPdfFile("prova.pdf");
    const input = document.querySelector<HTMLInputElement>("input[type=file]");
    fireEvent.change(input!, { target: { files: [file] } });

    // Aguarda o botão de extração aparecer
    await waitFor(() => expect(screen.getByText("Extrair com IA")).toBeTruthy());

    // Clica em extrair
    fireEvent.click(screen.getByText("Extrair com IA"));

    // Aguarda o modal de revisão aparecer
    await waitFor(
      () => expect(screen.getByText("Revisão de Questões Extraídas")).toBeTruthy(),
      { timeout: 4000 },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("extract-questions"),
      expect.any(Object),
    );
  });

  it("exibe as questões extraídas no modal de revisão", async () => {
    globalThis.fetch = vi.fn(async (url: string) => {
      if (String(url).includes("extract-questions")) {
        return {
          ok: true,
          json: async () => ({
            questions: [
              { text: "Questão de Física sobre inércia.", subject: "Física", has_figure: false },
            ],
          }),
        };
      }
      return { ok: false, json: async () => ({}) };
    }) as any;

    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText(/Nenhuma prova enviada/)).toBeTruthy());

    const file = createPdfFile();
    const input = document.querySelector<HTMLInputElement>("input[type=file]");
    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText("Extrair com IA")).toBeTruthy());
    fireEvent.click(screen.getByText("Extrair com IA"));

    await waitFor(
      () => expect(screen.getByText(/Questão de Física sobre inércia/)).toBeTruthy(),
      { timeout: 4000 },
    );
  });
});

describe("QuestionBank — histórico de provas", () => {
  const UPLOAD = {
    id: "u-1",
    file_name: "prova_matematica.pdf",
    file_path: "user-001/123_prova.pdf",
    questions_extracted: 10,
    uploaded_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageUpload.mockResolvedValue({ data: { path: "x" }, error: null });
    mockRpc.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => vi.restoreAllMocks());

  it("exibe provas do histórico carregadas do banco", async () => {
    mockFrom.mockImplementation((table: string) => {
      const c = buildEmptyChain();
      if (table === "pdf_uploads") {
        c.order = vi.fn(() => Promise.resolve({ data: [UPLOAD], error: null }));
      }
      return c;
    });

    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("prova_matematica.pdf")).toBeTruthy();
    });

    expect(screen.getByText(/10 questão\(ões\)/)).toBeTruthy();
  });

  it("exclui prova ao clicar em 'Excluir prova'", async () => {
    const uploadsChain = buildEmptyChain();
    uploadsChain.order = vi.fn(() => Promise.resolve({ data: [UPLOAD], error: null }));

    mockFrom.mockImplementation((table: string) => {
      if (table === "pdf_uploads") return uploadsChain;
      return buildEmptyChain();
    });

    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText("prova_matematica.pdf")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Excluir prova" }));

    await waitFor(() => {
      expect((uploadsChain.delete as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });
  });
});

describe("QuestionBank — interações de upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageUpload.mockResolvedValue({ data: { path: "x" }, error: null });
    mockRpc.mockResolvedValue({ data: [], error: null });
    mockFrom.mockImplementation(() => buildEmptyChain());
  });

  afterEach(() => vi.restoreAllMocks());

  it("remove arquivo selecionado ao clicar em 'Remover arquivo'", async () => {
    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText(/Nenhuma prova enviada/)).toBeTruthy());

    const file = createPdfFile("aula.pdf");
    const input = document.querySelector<HTMLInputElement>("input[type=file]");
    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByText(/aula\.pdf/)).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Remover arquivo" }));

    await waitFor(() =>
      expect(screen.queryByText(/aula\.pdf/)).toBeNull(),
    );
  });
});

describe("QuestionBank — modo de revisão", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageUpload.mockResolvedValue({ data: { path: "x" }, error: null });
    mockRpc.mockResolvedValue({ data: [], error: null });
    mockFrom.mockImplementation(() => buildEmptyChain());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function extractAndGoToReview() {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("extract-questions")) {
        return {
          ok: true,
          json: async () => ({
            questions: [
              { text: "Questão de revisão.", subject: "Matemática", has_figure: false },
            ],
          }),
        };
      }
      return { ok: false, json: async () => ({}) };
    });
    globalThis.fetch = fetchMock as any;

    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText(/Nenhuma prova enviada/)).toBeTruthy());

    const file = createPdfFile("prova.pdf");
    const input = document.querySelector<HTMLInputElement>("input[type=file]");
    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText("Extrair com IA")).toBeTruthy());
    fireEvent.click(screen.getByText("Extrair com IA"));

    await waitFor(
      () => expect(screen.getByText("Revisão de Questões Extraídas")).toBeTruthy(),
      { timeout: 4000 },
    );
  }

  it("fecha o modo de revisão ao clicar em 'Cancelar'", async () => {
    await extractAndGoToReview();

    // Two "Cancelar" buttons (top bar + sticky bottom); click the first
    const cancelBtns = screen.getAllByRole("button", { name: /Cancelar/ });
    fireEvent.click(cancelBtns[0]);

    await waitFor(() => {
      expect(screen.queryByText("Revisão de Questões Extraídas")).toBeNull();
    });
  });

  it("exibe o botão 'Salvar todas' com contagem no modo de revisão", async () => {
    await extractAndGoToReview();
    // Two "Salvar todas" buttons (top bar + sticky bottom); just check at least one exists
    expect(screen.getAllByText(/Salvar todas/).length).toBeGreaterThan(0);
  });

  it("remove questão da lista ao clicar no botão de excluir", async () => {
    await extractAndGoToReview();

    // The question card should be visible
    expect(screen.getByText(/Questão de revisão/)).toBeTruthy();

    // Click the delete button (aria-label "Excluir questão 1 da lista")
    const deleteBtn = screen.getByRole("button", { name: /Excluir questão 1 da lista/ });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Questão de revisão/)).toBeNull();
    });
  });
});

describe("QuestionBank — edição rica de alternativas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageUpload.mockResolvedValue({ data: { path: "x" }, error: null });
    mockRpc.mockResolvedValue({ data: [], error: null });
    mockFrom.mockImplementation(() => buildEmptyChain());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function extractWithOptions() {
    globalThis.fetch = vi.fn(async (url: string) => {
      if (String(url).includes("extract-questions")) {
        return {
          ok: true,
          json: async () => ({
            questions: [
              {
                text: "Qual o resultado de 2+2?",
                subject: "Matemática",
                options: ["2", "3", "4"],
                correct_answer: 2,
                has_figure: false,
              },
            ],
          }),
        };
      }
      return { ok: false, json: async () => ({}) };
    }) as any;

    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText(/Nenhuma prova enviada/)).toBeTruthy());

    const file = createPdfFile("prova.pdf");
    const input = document.querySelector<HTMLInputElement>("input[type=file]");
    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText("Extrair com IA")).toBeTruthy());
    fireEvent.click(screen.getByText("Extrair com IA"));

    await waitFor(
      () => expect(screen.getByText("Revisão de Questões Extraídas")).toBeTruthy(),
      { timeout: 4000 },
    );

    // Enter edit mode
    const editBtn = screen.getByRole("button", { name: /Editar/ });
    fireEvent.click(editBtn);
  }

  it("exibe inputs editáveis para o texto de cada alternativa no modo de edição", async () => {
    await extractWithOptions();

    // Options "2", "3", "4" should appear as editable inputs
    const optionInputs = screen.getAllByRole("textbox", {
      name: /Alternativa [ABC]/,
    });
    expect(optionInputs.length).toBe(3);
  });

  it("atualiza o texto da alternativa ao editar o input", async () => {
    await extractWithOptions();

    const optionInputs = screen.getAllByRole("textbox", {
      name: /Alternativa A/,
    });
    const firstInput = optionInputs[0] as HTMLInputElement;
    fireEvent.change(firstInput, { target: { value: "Novo texto A" } });

    await waitFor(() => {
      expect(firstInput.value).toBe("Novo texto A");
    });
  });

  it("remove alternativa ao clicar no botão de remover", async () => {
    await extractWithOptions();

    const removeBtns = screen.getAllByRole("button", {
      name: /Remover alternativa [ABC]/,
    });
    expect(removeBtns.length).toBe(3);

    fireEvent.click(removeBtns[0]);

    await waitFor(() => {
      const remaining = screen.queryAllByRole("textbox", { name: /Alternativa [ABC]/ });
      expect(remaining.length).toBe(2);
    });
  });

  it("adiciona nova alternativa ao clicar em 'Adicionar alternativa'", async () => {
    await extractWithOptions();

    const addBtn = screen.getByRole("button", { name: /Adicionar alternativa/ });
    fireEvent.click(addBtn);

    await waitFor(() => {
      const inputs = screen.getAllByRole("textbox", { name: /Alternativa [ABCD]/ });
      expect(inputs.length).toBe(4);
    });
  });

  it("não permite remover a única alternativa restante (disabled button)", async () => {
    globalThis.fetch = vi.fn(async (url: string) => {
      if (String(url).includes("extract-questions")) {
        return {
          ok: true,
          json: async () => ({
            questions: [
              {
                text: "Questão com uma alternativa.",
                subject: "Matemática",
                options: ["Única opção"],
                correct_answer: 0,
                has_figure: false,
              },
            ],
          }),
        };
      }
      return { ok: false, json: async () => ({}) };
    }) as any;

    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText(/Nenhuma prova enviada/)).toBeTruthy());

    const file = createPdfFile("prova.pdf");
    const input = document.querySelector<HTMLInputElement>("input[type=file]");
    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText("Extrair com IA")).toBeTruthy());
    fireEvent.click(screen.getByText("Extrair com IA"));

    await waitFor(
      () => expect(screen.getByText("Revisão de Questões Extraídas")).toBeTruthy(),
      { timeout: 4000 },
    );

    const editBtn = screen.getByRole("button", { name: /Editar/ });
    fireEvent.click(editBtn);

    const removeBtn = screen.getByRole("button", { name: /Remover alternativa A/ });
    expect((removeBtn as HTMLButtonElement).disabled).toBe(true);
  });
});

// ─── Helpers for persistence tests ─────────────────────────────────────────

function buildInsertCapture() {
  const insertArgs: any[] = [];
  const insertMock = vi.fn((rows: any[]) => {
    insertArgs.push(...rows);
    return {
      select: vi.fn(() => Promise.resolve({ data: [{ id: "new-q" }], error: null })),
    };
  });
  return { insertArgs, insertMock };
}

async function extractAndEnterEditMode(q: {
  text: string;
  subject?: string;
  options?: string[];
  correct_answer?: number;
  difficulty?: string;
}) {
  globalThis.fetch = vi.fn(async (url: string) => {
    if (String(url).includes("extract-questions")) {
      return {
        ok: true,
        json: async () => ({
          questions: [
            {
              text: q.text,
              subject: q.subject ?? "Matemática",
              options: q.options,
              correct_answer: q.correct_answer,
              difficulty: q.difficulty,
              has_figure: false,
            },
          ],
        }),
      };
    }
    return { ok: false, json: async () => ({}) };
  }) as any;

  const Wrapper = createTestWrapper("/dashboard/banco-questoes");
  render(<QuestionBank />, { wrapper: Wrapper });

  await waitFor(() => expect(screen.getByText(/Nenhuma prova enviada/)).toBeTruthy());

  const file = createPdfFile("prova.pdf");
  fireEvent.change(document.querySelector<HTMLInputElement>("input[type=file]")!, {
    target: { files: [file] },
  });

  await waitFor(() => expect(screen.getByText("Extrair com IA")).toBeTruthy());
  fireEvent.click(screen.getByText("Extrair com IA"));

  await waitFor(
    () => expect(screen.getByText("Revisão de Questões Extraídas")).toBeTruthy(),
    { timeout: 4000 },
  );

  fireEvent.click(screen.getByRole("button", { name: /Editar/ }));
}

describe("QuestionBank — lógica de correct_answer e persistência", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageUpload.mockResolvedValue({ data: { path: "x" }, error: null });
    mockRpc.mockResolvedValue({ data: [], error: null });
    mockFrom.mockImplementation(() => buildEmptyChain());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("salva correct_answer null no banco quando gabarito é desmarcado (-1)", async () => {
    const { insertArgs, insertMock } = buildInsertCapture();
    mockFrom.mockImplementation((table: string) => {
      const c = buildEmptyChain();
      if (table === "question_bank") c.insert = insertMock;
      return c;
    });

    await extractAndEnterEditMode({
      text: "Calcule 2+2.",
      options: ["2", "3", "4"],
      correct_answer: 2,
    });

    // Click option C (the correct one) to deselect it — sets correct_answer to -1
    fireEvent.click(screen.getByRole("button", { name: "C" }));

    // Save this individual question
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
      expect(insertArgs[0].correct_answer).toBeNull();
    });
  });

  it("salva difficulty da questão extraída, não usa padrão 'medio' fixo", async () => {
    const { insertArgs, insertMock } = buildInsertCapture();
    mockFrom.mockImplementation((table: string) => {
      const c = buildEmptyChain();
      if (table === "question_bank") c.insert = insertMock;
      return c;
    });

    await extractAndEnterEditMode({
      text: "Questão difícil.",
      options: ["A", "B"],
      correct_answer: 0,
      difficulty: "dificil",
    });

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
      expect(insertArgs[0].difficulty).toBe("dificil");
    });
  });
});

describe("QuestionBank — detecção de duplicatas", () => {
  const EXISTING_QUESTION = {
    id: "dup-001",
    text: "Questão já existente no banco.",
    subject: "Matemática",
    topic: null,
    difficulty: "medio",
    options: null,
    correct_answer: null,
    resolution: null,
    image_url: null,
    source: "manual",
    source_file_name: null,
    is_public: false,
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageUpload.mockResolvedValue({ data: { path: "x" }, error: null });
    mockRpc.mockResolvedValue({ data: [], error: null });

    // useQuestions queries question_bank — return a matching question
    mockFrom.mockImplementation((table: string) => {
      const c = buildEmptyChain();
      if (table === "question_bank") {
        c.order = vi.fn(() =>
          Promise.resolve({ data: [EXISTING_QUESTION], error: null }),
        );
      }
      return c;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("handleSaveOne desmarca checkbox (selected=false) ao re-detectar duplicata via 'Forçar inclusão'", async () => {
    // Extract a question with the same text as EXISTING_QUESTION
    globalThis.fetch = vi.fn(async (url: string) => {
      if (String(url).includes("extract-questions")) {
        return {
          ok: true,
          json: async () => ({
            questions: [
              {
                text: EXISTING_QUESTION.text,
                subject: "Matemática",
                has_figure: false,
              },
            ],
          }),
        };
      }
      return { ok: false, json: async () => ({}) };
    }) as any;

    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText(/Nenhuma prova enviada/)).toBeTruthy());
    // Give useQuestions a tick to resolve with EXISTING_QUESTION
    await new Promise((r) => setTimeout(r, 50));

    const file = createPdfFile("prova.pdf");
    fireEvent.change(document.querySelector<HTMLInputElement>("input[type=file]")!, {
      target: { files: [file] },
    });

    await waitFor(() => expect(screen.getByText("Extrair com IA")).toBeTruthy());
    fireEvent.click(screen.getByText("Extrair com IA"));

    // Extraction detects duplicate → badge "Duplicada" shown, selected=false
    await waitFor(
      () => expect(screen.getByText("Duplicada")).toBeTruthy(),
      { timeout: 4000 },
    );

    // "Forçar inclusão" → clears duplicate flag, marks selected=true
    fireEvent.click(screen.getByRole("button", { name: /Forçar inclusão/ }));

    // "Salvar" button should now be visible
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).toBeTruthy());

    // Click "Salvar" — handleSaveOne re-checks DB and re-detects duplicate
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    // After re-detection: isDuplicate=true AND selected must be false (checkbox unchecked)
    await waitFor(() => {
      const checkbox = screen.getByRole("checkbox", { name: "Selecionar questão 1" });
      expect(checkbox.getAttribute("data-state")).toBe("unchecked");
    });
  });
});

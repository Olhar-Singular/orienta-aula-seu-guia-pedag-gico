import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createTestWrapper } from "../helpers";

const {
  mockFrom,
  mockStorageUpload,
  mockGetPublicUrl,
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
    mockGetPublicUrl: vi.fn(),
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
    storage: {
      from: () => ({
        upload: mockStorageUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: { access_token: "tok" } } }),
      ),
    },
  },
}));

vi.mock("@/lib/latexRenderer", () => ({
  renderMathToHtml: vi.fn((text: string) => text),
  hasMathContent: vi.fn(() => false),
}));

import QuestionForm from "@/components/QuestionForm";

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildChain(data: any = null, error: any = null) {
  const c: any = {
    insert: vi.fn(() => Promise.resolve({ data, error })),
    update: vi.fn(() => c),
    eq: vi.fn(() => Promise.resolve({ data, error })),
    then: vi.fn((resolve: any) => resolve({ data, error })),
  };
  return c;
}

const SAMPLE_QUESTION = {
  id: "q-001",
  text: "Qual é a capital do Brasil?",
  subject: "Geografia",
  grade: "9º ano",
  topic: "Capitais",
  difficulty: "facil",
  resolution: "Brasília",
  image_url: null,
  options: null,
  correct_answer: null,
};

// ─── Setup ─────────────────────────────────────────────────────────────────

beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    (Element.prototype as any).scrollIntoView = () => {};
  }
  if (!Element.prototype.hasPointerCapture) {
    (Element.prototype as any).hasPointerCapture = () => false;
  }
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("QuestionForm — renderização básica", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => buildChain());
    mockStorageUpload.mockResolvedValue({ data: { path: "x" }, error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://example.com/img.png" } });
  });

  afterEach(() => vi.restoreAllMocks());

  it("renders 'Adicionar Questão' title in add mode", () => {
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm open={true} onOpenChange={vi.fn()} question={null} onSaved={vi.fn()} />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText("Adicionar Questão")).toBeTruthy();
  });

  it("renders 'Editar Questão' title in edit mode", () => {
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm
        open={true}
        onOpenChange={vi.fn()}
        question={SAMPLE_QUESTION}
        onSaved={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText("Editar Questão")).toBeTruthy();
  });

  it("renders save button as 'Adicionar' in add mode", () => {
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm open={true} onOpenChange={vi.fn()} question={null} onSaved={vi.fn()} />,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole("button", { name: "Adicionar" })).toBeTruthy();
  });

  it("renders save button as 'Atualizar' in edit mode", () => {
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm
        open={true}
        onOpenChange={vi.fn()}
        question={SAMPLE_QUESTION}
        onSaved={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeTruthy();
  });

  it("does not render when closed", () => {
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm open={false} onOpenChange={vi.fn()} question={null} onSaved={vi.fn()} />,
      { wrapper: Wrapper },
    );
    expect(screen.queryByText("Adicionar Questão")).toBeNull();
  });
});

describe("QuestionForm — preenchimento em modo edição", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => buildChain());
  });

  afterEach(() => vi.restoreAllMocks());

  it("populates enunciado textarea with question text", async () => {
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm
        open={true}
        onOpenChange={vi.fn()}
        question={SAMPLE_QUESTION}
        onSaved={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      const textarea = screen.getByDisplayValue("Qual é a capital do Brasil?");
      expect(textarea).toBeTruthy();
    });
  });

  it("populates resolution textarea with question resolution", async () => {
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm
        open={true}
        onOpenChange={vi.fn()}
        question={SAMPLE_QUESTION}
        onSaved={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      const textarea = screen.getByDisplayValue("Brasília");
      expect(textarea).toBeTruthy();
    });
  });

  it("shows alternatives section for 'objetiva' questions", () => {
    const objectiveQuestion = {
      ...SAMPLE_QUESTION,
      resolution: "",
      options: ["Opção X", "Opção Y", "Opção Z"],
      correct_answer: 0,
    };
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm
        open={true}
        onOpenChange={vi.fn()}
        question={objectiveQuestion}
        onSaved={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText("Alternativas")).toBeTruthy();
    expect(screen.getByDisplayValue("Opção X")).toBeTruthy();
  });
});

describe("QuestionForm — validação ao salvar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => buildChain());
  });

  afterEach(() => vi.restoreAllMocks());

  it("does NOT call supabase when enunciado is empty", async () => {
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm open={true} onOpenChange={vi.fn()} question={null} onSaved={vi.fn()} />,
      { wrapper: Wrapper },
    );

    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));

    await new Promise((r) => setTimeout(r, 50));
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("does NOT call supabase when new question has no grade/subject", async () => {
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm open={true} onOpenChange={vi.fn()} question={null} onSaved={vi.fn()} />,
      { wrapper: Wrapper },
    );

    // Type enunciado but leave grade/subject empty
    const textarea = screen.getByPlaceholderText(/Digite o enunciado/);
    fireEvent.change(textarea, { target: { value: "Minha questão" } });

    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));

    await new Promise((r) => setTimeout(r, 50));
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("QuestionForm — fluxo de salvamento em modo edição", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageUpload.mockResolvedValue({ data: { path: "x" }, error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://example.com/img.png" } });
  });

  afterEach(() => vi.restoreAllMocks());

  it("calls update on question_bank when editing existing question", async () => {
    const updateMock = vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    }));
    mockFrom.mockImplementation(() => ({ update: updateMock }));

    const onSaved = vi.fn();
    const onOpenChange = vi.fn();
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm
        open={true}
        onOpenChange={onOpenChange}
        question={SAMPLE_QUESTION}
        onSaved={onSaved}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() =>
      expect(screen.getByDisplayValue("Qual é a capital do Brasil?")).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("question_bank");
      expect(updateMock).toHaveBeenCalled();
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it("calls insert on question_bank when adding new question with grade and subject via defaultProps", async () => {
    const insertMock = vi.fn(() => Promise.resolve({ error: null }));
    mockFrom.mockImplementation(() => ({ insert: insertMock }));

    const onSaved = vi.fn();
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm
        open={true}
        onOpenChange={vi.fn()}
        question={null}
        onSaved={onSaved}
        defaultGrade="9º ano"
        defaultSubject="Matemática"
      />,
      { wrapper: Wrapper },
    );

    // Type enunciado
    const textarea = screen.getByPlaceholderText(/Digite o enunciado/);
    fireEvent.change(textarea, { target: { value: "Calcule 2 + 2" } });

    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("question_bank");
      expect(insertMock).toHaveBeenCalled();
    });
  });
});

describe("QuestionForm — tipo de questão objetiva", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => buildChain());
  });

  afterEach(() => vi.restoreAllMocks());

  it("shows 'Adicionar' button for alternatives in objetiva mode", async () => {
    const objectiveQuestion = {
      ...SAMPLE_QUESTION,
      options: ["A", "B"],
      correct_answer: 0,
    };
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm
        open={true}
        onOpenChange={vi.fn()}
        question={objectiveQuestion}
        onSaved={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Adicionar/ })).toBeTruthy();
    });
  });

  it("displays all options from the question", async () => {
    const objectiveQuestion = {
      ...SAMPLE_QUESTION,
      options: ["Opção A", "Opção B", "Opção C"],
      correct_answer: 1,
    };
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm
        open={true}
        onOpenChange={vi.fn()}
        question={objectiveQuestion}
        onSaved={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Opção A")).toBeTruthy();
      expect(screen.getByDisplayValue("Opção B")).toBeTruthy();
      expect(screen.getByDisplayValue("Opção C")).toBeTruthy();
    });
  });

  it("edits an option's text when typing in its input", async () => {
    const objectiveQuestion = {
      ...SAMPLE_QUESTION,
      resolution: "",
      options: ["Original A", "Opção B"],
      correct_answer: null,
    };
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm
        open={true}
        onOpenChange={vi.fn()}
        question={objectiveQuestion}
        onSaved={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(screen.getByDisplayValue("Original A")).toBeTruthy());

    const optionInput = screen.getByDisplayValue("Original A") as HTMLInputElement;
    fireEvent.change(optionInput, { target: { value: "Modificada A" } });

    await waitFor(() => expect(optionInput.value).toBe("Modificada A"));
  });

  it("marks an option as correct answer when clicking its letter button", async () => {
    const objectiveQuestion = {
      ...SAMPLE_QUESTION,
      resolution: "",
      options: ["Alternativa X", "Alternativa Y"],
      correct_answer: null,
    };
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm
        open={true}
        onOpenChange={vi.fn()}
        question={objectiveQuestion}
        onSaved={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(screen.getByDisplayValue("Alternativa X")).toBeTruthy());

    // The button for option A shows the letter "A" (not yet correct)
    const optionABtn = screen.getByRole("button", { name: "A" });
    fireEvent.click(optionABtn);

    // After clicking, option A is now correct — button shows "✓"
    await waitFor(() => expect(screen.getByRole("button", { name: "✓" })).toBeTruthy());
  });

  it("removes an option when clicking the X icon button", async () => {
    const objectiveQuestion = {
      ...SAMPLE_QUESTION,
      resolution: "",
      options: ["Para remover", "Para manter"],
      correct_answer: null,
    };
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm
        open={true}
        onOpenChange={vi.fn()}
        question={objectiveQuestion}
        onSaved={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(screen.getByDisplayValue("Para remover")).toBeTruthy());

    // Remove icon buttons have no text (just an X SVG)
    const allButtons = screen.getAllByRole("button");
    const removeButtons = allButtons.filter(
      (btn) => (btn.textContent || "").trim() === "" &&
        (btn as HTMLButtonElement).getAttribute("type") === "button",
    );
    expect(removeButtons.length).toBeGreaterThan(0);

    fireEvent.click(removeButtons[0]);

    await waitFor(() => expect(screen.queryByDisplayValue("Para remover")).toBeNull());
  });

  it("adds a new empty option when clicking 'Adicionar'", async () => {
    const objectiveQuestion = {
      ...SAMPLE_QUESTION,
      resolution: "",
      options: ["Existente"],
      correct_answer: null,
    };
    const Wrapper = createTestWrapper();
    render(
      <QuestionForm
        open={true}
        onOpenChange={vi.fn()}
        question={objectiveQuestion}
        onSaved={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(screen.getByDisplayValue("Existente")).toBeTruthy());

    // Should have 1 option input initially
    const inputsBefore = screen.getAllByPlaceholderText(/Alternativa/);
    expect(inputsBefore.length).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: /Adicionar/ }));

    await waitFor(() => {
      const inputsAfter = screen.getAllByPlaceholderText(/Alternativa/);
      expect(inputsAfter.length).toBe(2);
    });
  });
});

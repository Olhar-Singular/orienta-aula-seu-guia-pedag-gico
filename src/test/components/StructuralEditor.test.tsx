import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createTestWrapper } from "../helpers";
import type { EditableActivity } from "@/lib/pdf/editableActivity";

// Mock @dnd-kit — not testing drag-drop interactions
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: any) => children,
  DragOverlay: ({ children }: any) => children,
  PointerSensor: vi.fn(),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
  }),
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  useSensor: vi.fn(),
  useSensors: () => [],
}));

import StructuralEditor from "@/components/adaptation/pdf-preview/StructuralEditor";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockActivityWithCheckItems: EditableActivity = {
  header: { schoolName: "", subject: "", teacherName: "", className: "", date: "", showStudentLine: false },
  globalShowSeparators: false,
  questions: [{
    id: "q1", number: 1,
    content: [{ id: "b1", type: "text", content: "Selecione as corretas:" }],
    questionType: "multiple_answer",
    checkItems: [
      { text: "Opção correta 1", checked: true },
      { text: "Opção errada", checked: false },
    ],
  }],
};

const mockActivityWithTfItems: EditableActivity = {
  header: { schoolName: "", subject: "", teacherName: "", className: "", date: "", showStudentLine: false },
  globalShowSeparators: false,
  questions: [{
    id: "q1", number: 1,
    content: [{ id: "b1", type: "text", content: "Verdadeiro ou Falso:" }],
    questionType: "true_false",
    tfItems: [
      { text: "Primeira afirmação", marked: null },
      { text: "Segunda afirmação", marked: true },
    ],
  }],
};

const mockActivityWithMatchPairs: EditableActivity = {
  header: { schoolName: "", subject: "", teacherName: "", className: "", date: "", showStudentLine: false },
  globalShowSeparators: false,
  questions: [{
    id: "q1", number: 1,
    content: [{ id: "b1", type: "text", content: "Associe as colunas:" }],
    questionType: "matching",
    matchPairs: [
      { left: "Brasil", right: "Brasília" },
      { left: "Argentina", right: "Buenos Aires" },
    ],
  }],
};

const mockActivityWithOrderItems: EditableActivity = {
  header: { schoolName: "", subject: "", teacherName: "", className: "", date: "", showStudentLine: false },
  globalShowSeparators: false,
  questions: [{
    id: "q1", number: 1,
    content: [{ id: "b1", type: "text", content: "Ordene do menor para o maior:" }],
    questionType: "ordering",
    orderItems: [
      { n: 1, text: "Célula" },
      { n: 2, text: "Tecido" },
    ],
  }],
};

const mockActivityWithTableRows: EditableActivity = {
  header: { schoolName: "", subject: "", teacherName: "", className: "", date: "", showStudentLine: false },
  globalShowSeparators: false,
  questions: [{
    id: "q1", number: 1,
    content: [{ id: "b1", type: "text", content: "Marque a resposta:" }],
    questionType: "table",
    tableRows: [
      ["", "Sim", "Não"],
      ["Item 1", "( )", "( )"],
    ],
  }],
};

const mockActivityWithAnswerLines: EditableActivity = {
  header: { schoolName: "", subject: "", teacherName: "", className: "", date: "", showStudentLine: false },
  globalShowSeparators: false,
  questions: [{
    id: "q1", number: 1,
    content: [{ id: "b1", type: "text", content: "Explique com suas palavras:" }],
    questionType: "open_ended",
    answerLines: 3,
  }],
};

const mockActivity: EditableActivity = {
  header: {
    schoolName: "Escola X",
    subject: "",
    teacherName: "",
    className: "",
    date: "11/04/2026",
    showStudentLine: true,
  },
  globalShowSeparators: false,
  questions: [
    {
      id: "q1",
      number: 1,
      content: [
        {
          id: "b1",
          type: "text",
          content: "Sample question text here that is long enough for truncation testing",
        },
      ],
    },
  ],
};

const mockActivityWithAlternatives: EditableActivity = {
  header: {
    schoolName: "Escola Y",
    subject: "Matemática",
    teacherName: "Prof. Silva",
    className: "5A",
    date: "11/04/2026",
    showStudentLine: false,
  },
  globalShowSeparators: true,
  questions: [
    {
      id: "q1",
      number: 1,
      content: [
        {
          id: "b1",
          type: "text",
          content: "Qual é a capital do Brasil?",
        },
      ],
      alternatives: ["a) Rio de Janeiro", "b) São Paulo", "c) Brasília"],
    },
    {
      id: "q2",
      number: 2,
      content: [
        {
          id: "b2",
          type: "text",
          content: "Explique o ciclo da água.",
        },
      ],
    },
  ],
};

const mockActivityEmpty: EditableActivity = {
  header: {
    schoolName: "",
    subject: "",
    teacherName: "",
    className: "",
    date: "",
    showStudentLine: false,
  },
  globalShowSeparators: false,
  questions: [],
};

function makeDefaultProps(activity = mockActivity) {
  return {
    activity,
    onChange: vi.fn(),
    selectedQuestionId: null as string | null,
    onSelectQuestion: vi.fn(),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("StructuralEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders heading 'Estrutura do Documento'", () => {
    render(<StructuralEditor {...makeDefaultProps()} />, {
      wrapper: createTestWrapper(),
    });

    expect(screen.getByText("Estrutura do Documento")).toBeTruthy();
  });

  it("renders the HeaderEditor section (Cabecalho text)", () => {
    render(<StructuralEditor {...makeDefaultProps()} />, {
      wrapper: createTestWrapper(),
    });

    expect(screen.getByText("Cabecalho")).toBeTruthy();
  });

  it("renders question blocks with question number label", () => {
    render(<StructuralEditor {...makeDefaultProps()} />, {
      wrapper: createTestWrapper(),
    });

    expect(screen.getByText("Questao 1")).toBeTruthy();
  });

  it("renders multiple question blocks", () => {
    render(
      <StructuralEditor {...makeDefaultProps(mockActivityWithAlternatives)} />,
      { wrapper: createTestWrapper() }
    );

    expect(screen.getByText("Questao 1")).toBeTruthy();
    expect(screen.getByText("Questao 2")).toBeTruthy();
  });

  it("renders text block preview content (up to 80 chars)", () => {
    render(<StructuralEditor {...makeDefaultProps()} />, {
      wrapper: createTestWrapper(),
    });

    // The content is short enough to be displayed fully
    expect(
      screen.getByText(
        "Sample question text here that is long enough for truncation testing"
      )
    ).toBeTruthy();
  });

  it("truncates text block preview when content exceeds 80 chars", () => {
    const longContent =
      "Este é um texto de questão que é longo o suficiente para ser truncado com reticências pelo componente de preview";
    const activityWithLongText: EditableActivity = {
      ...mockActivity,
      questions: [
        {
          id: "q1",
          number: 1,
          content: [{ id: "b1", type: "text", content: longContent }],
        },
      ],
    };

    render(
      <StructuralEditor {...makeDefaultProps(activityWithLongText)} />,
      { wrapper: createTestWrapper() }
    );

    // Should show first 80 chars + ellipsis
    const expectedPreview = longContent.slice(0, 80) + "\u2026";
    expect(screen.getByText(expectedPreview)).toBeTruthy();
  });

  it("renders 'Separadores entre todas as questoes' checkbox", () => {
    render(<StructuralEditor {...makeDefaultProps()} />, {
      wrapper: createTestWrapper(),
    });

    expect(screen.getByText("Separadores entre todas as questoes")).toBeTruthy();
  });

  it("globalShowSeparators checkbox reflects initial state (false)", () => {
    render(<StructuralEditor {...makeDefaultProps()} />, {
      wrapper: createTestWrapper(),
    });

    const checkbox = screen.getByRole("checkbox", {
      name: /Separadores entre todas as questoes/i,
    });
    expect((checkbox as HTMLInputElement).checked).toBe(false);
  });

  it("globalShowSeparators checkbox reflects initial state (true)", () => {
    render(
      <StructuralEditor {...makeDefaultProps(mockActivityWithAlternatives)} />,
      { wrapper: createTestWrapper() }
    );

    const checkbox = screen.getByRole("checkbox", {
      name: /Separadores entre todas as questoes/i,
    });
    expect((checkbox as HTMLInputElement).checked).toBe(true);
  });

  it("calls onChange when separator checkbox is toggled", () => {
    const onChange = vi.fn();
    const props = { ...makeDefaultProps(), onChange };

    render(<StructuralEditor {...props} />, { wrapper: createTestWrapper() });

    const checkbox = screen.getByRole("checkbox", {
      name: /Separadores entre todas as questoes/i,
    });
    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ globalShowSeparators: true })
    );
  });

  it("renders without crashing when questions array is empty", () => {
    render(
      <StructuralEditor {...makeDefaultProps(mockActivityEmpty)} />,
      { wrapper: createTestWrapper() }
    );

    // Heading and header section should still render
    expect(screen.getByText("Estrutura do Documento")).toBeTruthy();
    expect(screen.getByText("Cabecalho")).toBeTruthy();

    // No question blocks
    expect(screen.queryByText(/Questao \d/)).toBeNull();
  });

  it("header fields are pre-filled with activity header values", () => {
    render(
      <StructuralEditor {...makeDefaultProps(mockActivityWithAlternatives)} />,
      { wrapper: createTestWrapper() }
    );

    // HeaderEditor is expanded by default — inputs should show the values
    const escolaInput = screen.getByDisplayValue("Escola Y");
    expect(escolaInput).toBeTruthy();
  });

  it("calls onChange when header school name is changed", () => {
    const onChange = vi.fn();
    const props = {
      ...makeDefaultProps(mockActivityWithAlternatives),
      onChange,
    };

    render(<StructuralEditor {...props} />, { wrapper: createTestWrapper() });

    const escolaInput = screen.getByDisplayValue("Escola Y");
    fireEvent.change(escolaInput, { target: { value: "Escola Nova" } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({ schoolName: "Escola Nova" }),
      })
    );
  });

  it("clicking on a question block calls onSelectQuestion with its id", () => {
    const onSelectQuestion = vi.fn();
    const props = { ...makeDefaultProps(), onSelectQuestion };

    render(<StructuralEditor {...props} />, { wrapper: createTestWrapper() });

    // Click the question block (the outer div with the label)
    const questionLabel = screen.getByText("Questao 1");
    // Click the parent container (the QuestionBlock div)
    fireEvent.click(questionLabel.closest(".rounded-lg")!);

    expect(onSelectQuestion).toHaveBeenCalledWith("q1");
  });

  it("selected question gets highlighted styling", () => {
    const props = {
      ...makeDefaultProps(),
      selectedQuestionId: "q1",
    };

    const { container } = render(<StructuralEditor {...props} />, {
      wrapper: createTestWrapper(),
    });

    // The selected question block should have ring-1 ring-blue-200 and border-blue-400
    const questionBlock = container.querySelector(".border-blue-400");
    expect(questionBlock).toBeTruthy();
  });

  it("instructions paragraph is rendered below the heading", () => {
    render(<StructuralEditor {...makeDefaultProps()} />, {
      wrapper: createTestWrapper(),
    });

    expect(
      screen.getByText(
        /Arraste questoes, blocos e imagens/i
      )
    ).toBeTruthy();
  });

  // ─── Body-type previews ──────────────────────────────────────────────────

  it("renders checkItems preview section for multiple_answer questions", () => {
    render(
      <StructuralEditor {...makeDefaultProps(mockActivityWithCheckItems)} />,
      { wrapper: createTestWrapper() }
    );
    expect(screen.getByText("Caixas de seleção")).toBeTruthy();
    expect(screen.getByText("Opção correta 1")).toBeTruthy();
    expect(screen.getByText("Opção errada")).toBeTruthy();
  });

  it("renders tfItems preview section for true_false questions", () => {
    render(
      <StructuralEditor {...makeDefaultProps(mockActivityWithTfItems)} />,
      { wrapper: createTestWrapper() }
    );
    expect(screen.getByText("Verdadeiro / Falso")).toBeTruthy();
    expect(screen.getByText("Primeira afirmação")).toBeTruthy();
    expect(screen.getByText("Segunda afirmação")).toBeTruthy();
  });

  it("renders matchPairs preview section for matching questions", () => {
    render(
      <StructuralEditor {...makeDefaultProps(mockActivityWithMatchPairs)} />,
      { wrapper: createTestWrapper() }
    );
    expect(screen.getByText("Associação")).toBeTruthy();
    expect(screen.getByText("Brasil")).toBeTruthy();
    expect(screen.getByText("Brasília")).toBeTruthy();
    expect(screen.getByText("Argentina")).toBeTruthy();
    expect(screen.getByText("Buenos Aires")).toBeTruthy();
  });

  it("renders orderItems preview section for ordering questions", () => {
    render(
      <StructuralEditor {...makeDefaultProps(mockActivityWithOrderItems)} />,
      { wrapper: createTestWrapper() }
    );
    expect(screen.getByText("Ordenação")).toBeTruthy();
    expect(screen.getByText("Célula")).toBeTruthy();
    expect(screen.getByText("Tecido")).toBeTruthy();
  });

  it("renders tableRows preview section for table questions", () => {
    render(
      <StructuralEditor {...makeDefaultProps(mockActivityWithTableRows)} />,
      { wrapper: createTestWrapper() }
    );
    expect(screen.getByText("Tabela")).toBeTruthy();
    expect(screen.getByText("Sim")).toBeTruthy();
    expect(screen.getByText("Item 1")).toBeTruthy();
  });

  it("renders answerLines indicator when answerLines > 0", () => {
    render(
      <StructuralEditor {...makeDefaultProps(mockActivityWithAnswerLines)} />,
      { wrapper: createTestWrapper() }
    );
    expect(screen.getByText("3 linhas de resposta")).toBeTruthy();
  });
});

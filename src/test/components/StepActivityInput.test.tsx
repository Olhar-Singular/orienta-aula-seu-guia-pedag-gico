import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StepActivityInput from "@/components/adaptation/StepActivityInput";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((cb: any) => cb({ data: [], error: null })),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }),
    },
  },
}));

// Mock RichTextEditor
vi.mock("@/components/RichTextEditor", () => ({
  default: ({ content, onChange, placeholder }: any) => (
    <textarea
      data-testid="rich-editor"
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

// Mock ImagePreviewDialog
vi.mock("@/components/ImagePreviewDialog", () => ({
  default: () => null,
}));

describe("StepActivityInput", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
    selectedQuestions: [],
    onSelectedQuestionsChange: vi.fn(),
    onNext: vi.fn(),
    onPrev: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the heading", () => {
    render(<StepActivityInput {...defaultProps} />);
    expect(screen.getByText("Insira a atividade para adaptar")).toBeInTheDocument();
  });

  it("renders tab buttons", () => {
    render(<StepActivityInput {...defaultProps} />);
    expect(screen.getByText("Colar Texto")).toBeInTheDocument();
    expect(screen.getByText("Banco de Questões")).toBeInTheDocument();
  });

  it("shows the text editor on manual tab", () => {
    render(<StepActivityInput {...defaultProps} />);
    fireEvent.click(screen.getByText("Colar Texto"));
    expect(screen.getByTestId("rich-editor")).toBeInTheDocument();
  });

  it("disables Próximo when value is empty", () => {
    render(<StepActivityInput {...defaultProps} />);
    expect(screen.getByText("Próximo")).toBeDisabled();
  });

  it("enables Próximo when value has content", () => {
    render(<StepActivityInput {...defaultProps} value="Algum conteúdo" />);
    expect(screen.getByText("Próximo")).not.toBeDisabled();
  });

  it("calls onPrev when Voltar is clicked", () => {
    const onPrev = vi.fn();
    render(<StepActivityInput {...defaultProps} onPrev={onPrev} />);
    fireEvent.click(screen.getByText("Voltar"));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("calls onNext when Próximo is clicked", () => {
    const onNext = vi.fn();
    render(<StepActivityInput {...defaultProps} value="Texto" onNext={onNext} />);
    fireEvent.click(screen.getByText("Próximo"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("switches to banco tab when clicked", () => {
    render(<StepActivityInput {...defaultProps} />);
    fireEvent.click(screen.getByText("Banco de Questões"));
    expect(screen.getByText("Selecione questões do seu banco para compor a atividade.")).toBeInTheDocument();
  });

  it("shows character count on manual tab", () => {
    render(<StepActivityInput {...defaultProps} value="Hello" />);
    fireEvent.click(screen.getByText("Colar Texto"));
    expect(screen.getByText("5 caracteres")).toBeInTheDocument();
  });

  it("shows selected questions count", () => {
    render(
      <StepActivityInput
        {...defaultProps}
        selectedQuestions={[
          { id: "1", text: "Q1", image_url: null, options: null, subject: "Geral", topic: null, difficulty: null },
          { id: "2", text: "Q2", image_url: null, options: null, subject: "Geral", topic: null, difficulty: null },
        ]}
      />
    );
    // When selectedQuestions are provided, tab starts on banco
    expect(screen.getByText("2 questão(ões) selecionada(s):")).toBeInTheDocument();
  });
});

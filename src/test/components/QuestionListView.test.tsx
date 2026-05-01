import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestionListView, { type Question } from "@/components/question-bank/QuestionListView";

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    // @ts-expect-error jsdom stub
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.scrollIntoView) {
    // @ts-expect-error jsdom stub
    Element.prototype.scrollIntoView = () => {};
  }
});

const q1: Question = {
  id: "q1",
  text: "Quanto é 2+2?",
  subject: "Matemática",
  grade: "9º ano",
  topic: "Aritmética",
  difficulty: "facil",
  options: null,
  correct_answer: null,
  resolution: null,
  image_url: null,
  source: "manual",
  source_file_name: null,
  is_public: false,
  created_at: "2026-04-01",
};

const q2: Question = {
  ...q1,
  id: "q2",
  text: "Calcule a integral de x²",
  difficulty: "dificil",
  source: "pdf_extract",
};

function baseProps(overrides: Partial<React.ComponentProps<typeof QuestionListView>> = {}) {
  return {
    questions: [q1, q2],
    loading: false,
    searchQuery: "",
    onSearchChange: vi.fn(),
    filterDifficulty: "all",
    onFilterDifficultyChange: vi.fn(),
    filterSource: "all",
    onFilterSourceChange: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onPreviewImage: vi.fn(),
    deletingId: null,
    ...overrides,
  };
}

describe("QuestionListView", () => {
  it("renders grade badge for each question", () => {
    render(<QuestionListView {...baseProps()} />);
    expect(screen.getAllByText("9º ano").length).toBe(2);
  });

  it("filters by search query in text, topic and subject", () => {
    render(<QuestionListView {...baseProps({ searchQuery: "integral" })} />);
    expect(screen.queryByText(/Quanto é 2\+2/)).toBeNull();
    expect(screen.getByText(/integral de x/)).toBeTruthy();
  });

  it("filters by difficulty", () => {
    render(<QuestionListView {...baseProps({ filterDifficulty: "facil" })} />);
    expect(screen.getByText(/Quanto é 2\+2/)).toBeTruthy();
    expect(screen.queryByText(/integral de x/)).toBeNull();
  });

  it("filters by source", () => {
    render(<QuestionListView {...baseProps({ filterSource: "pdf_extract" })} />);
    expect(screen.getByText(/integral de x/)).toBeTruthy();
    expect(screen.queryByText(/Quanto é 2\+2/)).toBeNull();
  });

  it("shows loading state", () => {
    const { container } = render(<QuestionListView {...baseProps({ loading: true, questions: [] })} />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("shows empty state when no questions match", () => {
    render(<QuestionListView {...baseProps({ questions: [] })} />);
    expect(screen.getByText(/Nenhuma questão/)).toBeTruthy();
  });

  it("shows custom emptyLabel when provided and no questions", () => {
    render(<QuestionListView {...baseProps({ questions: [], emptyLabel: "Pasta vazia" })} />);
    expect(screen.getByText("Pasta vazia")).toBeTruthy();
  });

  it("delete requires confirmation (two-click pattern)", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<QuestionListView {...baseProps({ onDelete, questions: [q1] })} />);
    await user.click(screen.getByRole("button", { name: "Excluir questão" }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onDelete).toHaveBeenCalledWith("q1");
  });

  it("calls onMove when move button is clicked (when provided)", async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    render(<QuestionListView {...baseProps({ onMove, questions: [q1] })} />);
    await user.click(screen.getByRole("button", { name: "Mover questão" }));
    expect(onMove).toHaveBeenCalledWith(q1);
  });

  it("does NOT show move button when onMove is not provided", () => {
    render(<QuestionListView {...baseProps({ onMove: undefined, questions: [q1] })} />);
    expect(screen.queryByRole("button", { name: "Mover questão" })).toBeNull();
  });
});

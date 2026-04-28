import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MoveQuestionDialog from "@/components/question-bank/MoveQuestionDialog";
import type { Question } from "@/components/question-bank/QuestionListView";

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

const { mockFrom, mockToast } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: any[]) => mockToast(...args),
}));

function updateChain(error: any = null) {
  const chain: any = {
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    then: vi.fn((resolve: any) => resolve({ data: null, error })),
  };
  return chain;
}

const q: Question = {
  id: "q1",
  text: "Qual a capital?",
  subject: "Geografia",
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
};

describe("MoveQuestionDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not render when question is null", () => {
    render(<MoveQuestionDialog question={null} onOpenChange={vi.fn()} onMoved={vi.fn()} />);
    expect(screen.queryByText("Mover questão")).toBeNull();
  });

  it("pre-fills grade and subject from question", async () => {
    render(
      <MoveQuestionDialog question={q} onOpenChange={vi.fn()} onMoved={vi.fn()} />,
    );
    await screen.findByText("Mover questão");
    // Grade canônica exibe o valor pelo Select (trigger mostra o valor atual)
    expect(screen.getAllByText(/9º ano/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Geografia/).length).toBeGreaterThan(0);
  });

  it("uses 'other' mode for non-canonical grade", async () => {
    const nonCanon: Question = { ...q, grade: "Curso técnico" };
    render(
      <MoveQuestionDialog question={nonCanon} onOpenChange={vi.fn()} onMoved={vi.fn()} />,
    );
    const input = await screen.findByPlaceholderText(/Curso técnico/) as HTMLInputElement;
    expect(input.value).toBe("Curso técnico");
  });

  it("submits UPDATE with new grade/subject", async () => {
    const up = updateChain();
    mockFrom.mockImplementation(() => up);
    const onMoved = vi.fn();
    const user = userEvent.setup();
    render(
      <MoveQuestionDialog question={q} onOpenChange={vi.fn()} onMoved={onMoved} />,
    );
    await user.click(screen.getByRole("button", { name: "Mover" }));
    await waitFor(() =>
      expect(up.update).toHaveBeenCalledWith({ grade: "9º ano", subject: "Geografia" }),
    );
    await waitFor(() => expect(up.eq).toHaveBeenCalledWith("id", "q1"));
    await waitFor(() => expect(onMoved).toHaveBeenCalled());
  });

  it("sends grade: null when grade is empty", async () => {
    const noGrade: Question = { ...q, grade: null };
    const up = updateChain();
    mockFrom.mockImplementation(() => up);
    const user = userEvent.setup();
    render(
      <MoveQuestionDialog question={noGrade} onOpenChange={vi.fn()} onMoved={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: "Mover" }));
    await waitFor(() =>
      expect(up.update).toHaveBeenCalledWith(
        expect.objectContaining({ grade: null }),
      ),
    );
  });

  it("Mover button is disabled when subject is empty", async () => {
    const noSubject: Question = { ...q, subject: "" };
    render(
      <MoveQuestionDialog question={noSubject} onOpenChange={vi.fn()} onMoved={vi.fn()} />,
    );
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: "Mover" });
      expect(btn).toBeDisabled();
    });
  });
});

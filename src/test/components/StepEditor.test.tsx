import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepEditor } from "@/components/adaptation/StepEditor";
import { MOCK_MANUAL_STRUCTURED_ACTIVITY } from "../fixtures";

describe("StepEditor", () => {
  const defaultProps = {
    structuredActivity: MOCK_MANUAL_STRUCTURED_ACTIVITY,
    onStructuredActivityChange: vi.fn(),
    onNext: vi.fn(),
    onPrev: vi.fn(),
  };

  it("renders the editor heading", () => {
    render(<StepEditor {...defaultProps} />);
    expect(screen.getByText("Editar Atividade")).toBeDefined();
  });

  it("renders navigation buttons", () => {
    render(<StepEditor {...defaultProps} />);
    expect(screen.getByRole("button", { name: /voltar/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /avançar/i })).toBeDefined();
  });

  it("calls onPrev when Voltar is clicked", async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    render(<StepEditor {...defaultProps} onPrev={onPrev} />);
    await user.click(screen.getByRole("button", { name: /voltar/i }));
    expect(onPrev).toHaveBeenCalled();
  });

  it("calls onNext when Avançar is clicked", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<StepEditor {...defaultProps} onNext={onNext} />);
    await user.click(screen.getByRole("button", { name: /avançar/i }));
    expect(onNext).toHaveBeenCalled();
  });

  it("displays question count from structured activity", () => {
    render(<StepEditor {...defaultProps} />);
    const totalQuestions = MOCK_MANUAL_STRUCTURED_ACTIVITY.sections.reduce(
      (sum, s) => sum + s.questions.length,
      0
    );
    expect(screen.getByText(new RegExp(`${totalQuestions} quest`))).toBeDefined();
  });

  it("renders each question statement", () => {
    render(<StepEditor {...defaultProps} />);
    for (const section of MOCK_MANUAL_STRUCTURED_ACTIVITY.sections) {
      for (const q of section.questions) {
        expect(
          screen.getByText((content) => content.includes(q.statement))
        ).toBeDefined();
      }
    }
  });

  // ─── StructuredContentRenderer integration ───

  it("renders question numbers in circular badges (StructuredContentRenderer style)", () => {
    render(<StepEditor {...defaultProps} />);
    // StructuredContentRenderer renders each number in a rounded-full span
    const circles = document.querySelectorAll(".rounded-full");
    const numbers = Array.from(circles).map((el) => el.textContent?.trim());
    expect(numbers).toContain("1");
    expect(numbers).toContain("2");
    expect(numbers).toContain("3");
  });

  it("renders type badge with color classes (StructuredContentRenderer style)", () => {
    render(<StepEditor {...defaultProps} />);
    // multiple_choice gets bg-blue-100 class
    const blueBadges = document.querySelectorAll(".bg-blue-100");
    expect(blueBadges.length).toBeGreaterThan(0);
  });

  it("does not render raw textarea inputs for questions", () => {
    render(<StepEditor {...defaultProps} />);
    // Old StepEditor had inline textareas — new one should not
    const textareas = document.querySelectorAll("textarea");
    expect(textareas.length).toBe(0);
  });

  it("renders edit button on hover for each question", () => {
    render(<StepEditor {...defaultProps} />);
    // StructuredContentRenderer renders aria-label="Editar questão N"
    const editBtns = screen.getAllByRole("button", { name: /editar questão/i });
    expect(editBtns.length).toBe(
      MOCK_MANUAL_STRUCTURED_ACTIVITY.sections.reduce((s, sec) => s + sec.questions.length, 0)
    );
  });

  it("does not render regenerate buttons (manual mode has no AI)", () => {
    render(<StepEditor {...defaultProps} />);
    const regenBtns = screen.queryAllByRole("button", { name: /regenerar questão/i });
    expect(regenBtns.length).toBe(0);
  });
});

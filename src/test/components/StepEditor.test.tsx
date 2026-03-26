import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepEditor } from "@/components/adaptation/StepEditor";
import { MOCK_MANUAL_STRUCTURED_ACTIVITY } from "../fixtures";

describe("StepEditor", () => {
  const defaultProps = {
    activityText: "1) Quanto é 2 + 2?\na) 3\nb) 4\nc) 5",
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
    render(<StepEditor {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /voltar/i }));
    expect(defaultProps.onPrev).toHaveBeenCalled();
  });

  it("calls onNext when Avançar is clicked", async () => {
    const user = userEvent.setup();
    render(<StepEditor {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /avançar/i }));
    expect(defaultProps.onNext).toHaveBeenCalled();
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
        // Use function matcher since text is split across elements (number + statement)
        expect(
          screen.getByText((content) => content.includes(q.statement))
        ).toBeDefined();
      }
    }
  });
});

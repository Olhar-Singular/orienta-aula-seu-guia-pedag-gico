import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock ActivityEditor — the real one pulls in ImageManagerModal → useAuth,
// which isn't needed for these props-contract tests.
vi.mock("@/components/editor/ActivityEditor", () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="mock-activity-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

import { useState } from "react";
import { StepEditor } from "@/components/adaptation/StepEditor";
import { MOCK_MANUAL_STRUCTURED_ACTIVITY } from "../fixtures";

/** Stateful wrapper so the controlled dslDraft value reflects edits back to the child. */
function StatefulStepEditor(props: {
  initialDraft?: string;
  onDslDraftChange?: (v: string) => void;
  onNext?: (a: unknown) => void;
  onPrev?: () => void;
}) {
  const [draft, setDraft] = useState<string | undefined>(props.initialDraft);
  return (
    <StepEditor
      structuredActivity={MOCK_MANUAL_STRUCTURED_ACTIVITY}
      dslDraft={draft}
      onDslDraftChange={(v) => {
        setDraft(v);
        props.onDslDraftChange?.(v);
      }}
      onNext={props.onNext ?? vi.fn()}
      onPrev={props.onPrev ?? vi.fn()}
    />
  );
}

describe("StepEditor", () => {
  const defaultProps = {
    structuredActivity: MOCK_MANUAL_STRUCTURED_ACTIVITY,
    dslDraft: undefined,
    onDslDraftChange: vi.fn(),
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

  // ─── ActivityEditor integration ───

  it("renders the DSL textarea editor", () => {
    render(<StepEditor {...defaultProps} />);
    const textareas = document.querySelectorAll("textarea");
    expect(textareas.length).toBeGreaterThan(0);
  });

  it("initializes the editor with DSL text containing question statements", () => {
    render(<StepEditor {...defaultProps} />);
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeDefined();
    for (const section of MOCK_MANUAL_STRUCTURED_ACTIVITY.sections) {
      for (const q of section.questions) {
        expect(textarea.value).toContain(q.statement);
      }
    }
  });

  it("emits structured activity on Avançar", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<StepEditor {...defaultProps} onNext={onNext} />);
    await user.click(screen.getByRole("button", { name: /avançar/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
    const emitted = onNext.mock.calls[0][0];
    expect(emitted.sections).toBeDefined();
    expect(Array.isArray(emitted.sections)).toBe(true);
  });

  it("onNext receives the latest DSL edits, not the initial prop", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<StatefulStepEditor onNext={onNext} />);

    const textarea = document.querySelector(
      "textarea[data-testid='mock-activity-editor']",
    ) as HTMLTextAreaElement;
    // Replace DSL entirely with a single custom question
    await user.clear(textarea);
    await user.type(textarea, "1) Pergunta editada após o mount");

    await user.click(screen.getByRole("button", { name: /avançar/i }));

    const emitted = onNext.mock.calls[0][0] as { sections: Array<{ questions: Array<{ statement: string }> }> };
    const statements = emitted.sections.flatMap((s) => s.questions.map((q) => q.statement));
    expect(statements.some((s) => s.includes("Pergunta editada após o mount"))).toBe(true);
  });

  it("does not render regenerate buttons (manual mode has no AI)", () => {
    render(<StepEditor {...defaultProps} />);
    const regenBtns = screen.queryAllByRole("button", { name: /regenerar questão/i });
    expect(regenBtns.length).toBe(0);
  });

  // ─── Draft persistence (Bug 2) ───

  it("uses dslDraft prop instead of converting structuredActivity when draft is set", () => {
    render(
      <StepEditor
        {...defaultProps}
        dslDraft="meu rascunho manual"
        onDslDraftChange={vi.fn()}
      />,
    );
    const textarea = document.querySelector(
      "textarea[data-testid='mock-activity-editor']",
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe("meu rascunho manual");
  });

  it("calls onDslDraftChange on every edit", async () => {
    const user = userEvent.setup();
    const onDslDraftChange = vi.fn();
    render(
      <StatefulStepEditor
        initialDraft="start"
        onDslDraftChange={onDslDraftChange}
      />,
    );
    const textarea = document.querySelector(
      "textarea[data-testid='mock-activity-editor']",
    ) as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, "abc");
    expect(onDslDraftChange).toHaveBeenLastCalledWith("abc");
  });

  it("seeds the editor from structuredActivity on first mount when draft is undefined", () => {
    render(
      <StepEditor
        {...defaultProps}
        dslDraft={undefined}
        onDslDraftChange={vi.fn()}
      />,
    );
    // The hook seeds from structuredToMarkdownDsl(structuredActivity) internally;
    // the editor renders with that DSL without needing to mirror into parent state.
    const textarea = document.querySelector(
      "textarea[data-testid='mock-activity-editor']",
    ) as HTMLTextAreaElement;
    expect(textarea.value.length).toBeGreaterThan(0);
    expect(textarea.value).toContain(
      MOCK_MANUAL_STRUCTURED_ACTIVITY.sections[0].questions[0].statement,
    );
  });

  it("onNext receives activity parsed from the current editor value", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(
      <StatefulStepEditor
        initialDraft="1) pergunta inicial"
        onNext={onNext}
      />,
    );
    const textarea = document.querySelector(
      "textarea[data-testid='mock-activity-editor']",
    ) as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, "1) pergunta atualizada pelo usuario");
    await user.click(screen.getByRole("button", { name: /avançar/i }));
    const emitted = onNext.mock.calls[0][0];
    const statements = emitted.sections.flatMap(
      (s: { questions: { statement: string }[] }) => s.questions.map((q) => q.statement),
    );
    expect(statements.some((s: string) => s.includes("pergunta atualizada pelo usuario"))).toBe(true);
  });
});

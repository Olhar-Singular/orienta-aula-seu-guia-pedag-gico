import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestionFolderBreadcrumb, { type Crumb } from "@/components/question-bank/QuestionFolderBreadcrumb";

describe("QuestionFolderBreadcrumb", () => {
  it("renders root only when at top", () => {
    render(
      <QuestionFolderBreadcrumb crumbs={[{ kind: "root" }]} onNavigate={vi.fn()} />,
    );
    expect(screen.getByText("Banco")).toBeTruthy();
  });

  it("renders full path for subject level", () => {
    const crumbs: Crumb[] = [
      { kind: "root" },
      { kind: "grade", grade: "9º ano" },
      { kind: "subject", grade: "9º ano", subject: "Matemática" },
    ];
    render(<QuestionFolderBreadcrumb crumbs={crumbs} onNavigate={vi.fn()} />);
    expect(screen.getByText("Banco")).toBeTruthy();
    expect(screen.getByText("9º ano")).toBeTruthy();
    expect(screen.getByText("Matemática")).toBeTruthy();
  });

  it("clicking a non-last crumb calls onNavigate with that crumb", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    const crumbs: Crumb[] = [
      { kind: "root" },
      { kind: "grade", grade: "9º ano" },
      { kind: "subject", grade: "9º ano", subject: "Matemática" },
    ];
    render(<QuestionFolderBreadcrumb crumbs={crumbs} onNavigate={onNavigate} />);
    await user.click(screen.getByRole("button", { name: /9º ano/ }));
    expect(onNavigate).toHaveBeenCalledWith({ kind: "grade", grade: "9º ano" });
  });

  it("shows 'Sem série' label for null grade", () => {
    render(
      <QuestionFolderBreadcrumb
        crumbs={[{ kind: "root" }, { kind: "grade", grade: null }]}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.getByText("Sem série")).toBeTruthy();
  });

  it("shows 'Sem matéria' label for null subject", () => {
    render(
      <QuestionFolderBreadcrumb
        crumbs={[
          { kind: "root" },
          { kind: "grade", grade: "9º ano" },
          { kind: "subject", grade: "9º ano", subject: null },
        ]}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.getByText("Sem matéria")).toBeTruthy();
  });

  it("last crumb is not clickable", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestionFolderBreadcrumb
        crumbs={[{ kind: "root" }, { kind: "grade", grade: "9º ano" }]}
        onNavigate={onNavigate}
      />,
    );
    // "9º ano" is last — it's a span, not a button. Clicking does nothing.
    const span = screen.getByText("9º ano");
    await user.click(span);
    expect(onNavigate).not.toHaveBeenCalled();
  });
});

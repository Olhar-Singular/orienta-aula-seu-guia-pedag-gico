import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GlobalSearchResults from "@/components/question-bank/GlobalSearchResults";
import type { Question } from "@/components/question-bank/QuestionListView";

function mk(id: string, overrides: Partial<Question> = {}): Question {
  return {
    id,
    text: `Texto ${id}`,
    subject: "Matemática",
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
    ...overrides,
  };
}

function baseProps(overrides: any = {}) {
  return {
    query: "foo",
    results: [] as Question[],
    loading: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onPreviewImage: vi.fn(),
    deletingId: null,
    ...overrides,
  };
}

describe("GlobalSearchResults", () => {
  it("shows 'Buscando...' while loading", () => {
    render(<GlobalSearchResults {...baseProps({ loading: true })} />);
    expect(screen.getByText(/Buscando/)).toBeTruthy();
  });

  it("shows result count for non-empty results", () => {
    render(<GlobalSearchResults {...baseProps({ results: [mk("a"), mk("b")] })} />);
    expect(screen.getByText(/2 resultados para "foo"/)).toBeTruthy();
  });

  it("shows singular form for 1 result", () => {
    render(<GlobalSearchResults {...baseProps({ results: [mk("a")] })} />);
    expect(screen.getByText(/1 resultado para "foo"/)).toBeTruthy();
  });

  it("groups results by grade + subject with badge", () => {
    const results = [
      mk("a", { grade: "9º ano", subject: "Matemática" }),
      mk("b", { grade: "9º ano", subject: "Matemática" }),
      mk("c", { grade: "9º ano", subject: "Física" }),
      mk("d", { grade: "1ª série EM", subject: "Matemática" }),
    ];
    render(<GlobalSearchResults {...baseProps({ results })} />);
    expect(screen.getByText("9º ano · Matemática")).toBeTruthy();
    expect(screen.getByText("9º ano · Física")).toBeTruthy();
    expect(screen.getByText("1ª série EM · Matemática")).toBeTruthy();
  });

  it("falls back to 'Sem série' / 'Sem matéria' for null values", () => {
    const results = [mk("a", { grade: null, subject: "" })];
    render(<GlobalSearchResults {...baseProps({ results })} />);
    expect(screen.getByText("Sem série · Sem matéria")).toBeTruthy();
  });

  it("empty state when no results and not loading", () => {
    render(<GlobalSearchResults {...baseProps()} />);
    expect(screen.getByText("Nenhuma questão encontrada.")).toBeTruthy();
  });

  it("calls onEdit when editar button is clicked", async () => {
    const onEdit = vi.fn();
    const q = mk("a");
    const user = userEvent.setup();
    render(<GlobalSearchResults {...baseProps({ onEdit, results: [q] })} />);
    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(onEdit).toHaveBeenCalledWith(q);
  });

  it("calls onDelete when trash button is clicked", async () => {
    const onDelete = vi.fn();
    const q = mk("a");
    const user = userEvent.setup();
    render(<GlobalSearchResults {...baseProps({ onDelete, results: [q] })} />);
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onDelete).toHaveBeenCalledWith("a");
  });
});

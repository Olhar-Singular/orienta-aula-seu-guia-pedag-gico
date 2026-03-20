import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AdaptedContentRenderer from "@/components/adaptation/AdaptedContentRenderer";
import {
  MOCK_ACTIVITY_TEXT,
  MOCK_MATH_CONTENT,
} from "@/test/fixtures";

// Mock katex to avoid DOM rendering issues in jsdom
vi.mock("katex", () => ({
  default: { render: vi.fn() },
}));
vi.mock("katex/dist/katex.min.css", () => ({}));

describe("AdaptedContentRenderer", () => {
  it("renders question blocks with numbers", () => {
    render(<AdaptedContentRenderer content={MOCK_ACTIVITY_TEXT} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders alternative blocks with letters", () => {
    const content = "1. Qual é a resposta?\na) Opção A\nb) Opção B\nc) Opção C";
    render(<AdaptedContentRenderer content={content} />);
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
    expect(screen.getByText("c")).toBeInTheDocument();
  });

  it("renders header blocks", () => {
    const content = "ATIVIDADE ADAPTADA\n\n1. Responda a questão";
    render(<AdaptedContentRenderer content={content} />);
    expect(screen.getByText("ATIVIDADE ADAPTADA")).toBeInTheDocument();
  });

  it("renders bullet list blocks", () => {
    const content = "- Primeiro item\n- Segundo item\n- Terceiro item";
    render(<AdaptedContentRenderer content={content} />);
    expect(screen.getByText("Primeiro item")).toBeInTheDocument();
    expect(screen.getByText("Segundo item")).toBeInTheDocument();
  });

  it("renders paragraph blocks", () => {
    const content = "Este é um parágrafo de texto simples sem formatação especial.";
    render(<AdaptedContentRenderer content={content} />);
    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it("renders question images when provided", () => {
    const content = "1. Veja a imagem\na) Sim\nb) Não";
    const images = { "1": ["https://example.com/img.png"] };
    render(<AdaptedContentRenderer content={content} questionImages={images} />);
    const img = screen.getByRole("img", { name: "Imagem da questão 1" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/img.png");
  });

  it("shows edit button for questions when onEditQuestion is provided", () => {
    const content = "1. Qual é a resposta?\na) A\nb) B";
    const onEdit = vi.fn();
    render(<AdaptedContentRenderer content={content} onEditQuestion={onEdit} />);
    const editBtn = screen.getByLabelText("Editar questão 1");
    expect(editBtn).toBeInTheDocument();
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("does not show edit button when onEditQuestion is not provided", () => {
    const content = "1. Qual é a resposta?\na) A\nb) B";
    render(<AdaptedContentRenderer content={content} />);
    expect(screen.queryByLabelText("Editar questão 1")).not.toBeInTheDocument();
  });

  it("shows delete and edit buttons for paragraphs when onContentChange is provided", () => {
    const content = "Este é um texto de dica do professor.";
    const onChange = vi.fn();
    render(<AdaptedContentRenderer content={content} onContentChange={onChange} />);
    expect(screen.getByLabelText("Remover parágrafo")).toBeInTheDocument();
    expect(screen.getByLabelText("Editar parágrafo")).toBeInTheDocument();
  });

  it("shows delete and edit buttons for bullet lists when onContentChange is provided", () => {
    const content = "- Item 1\n- Item 2";
    const onChange = vi.fn();
    render(<AdaptedContentRenderer content={content} onContentChange={onChange} />);
    expect(screen.getByLabelText("Remover lista")).toBeInTheDocument();
    expect(screen.getByLabelText("Editar lista")).toBeInTheDocument();
  });

  it("calls onContentChange when delete paragraph is clicked", () => {
    const content = "Texto para remover";
    const onChange = vi.fn();
    render(<AdaptedContentRenderer content={content} onContentChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Remover parágrafo"));
    expect(onChange).toHaveBeenCalledTimes(1);
    // Content should be empty after removing the only paragraph
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("strips italic underscore markers from rendered text", () => {
    const content = "1. Responda: (_Será que queremos?_)";
    render(<AdaptedContentRenderer content={content} />);
    // Should not show underscores
    expect(screen.queryByText(/_Será/)).not.toBeInTheDocument();
  });

  it("strips bold markers from rendered text", () => {
    const content = "1. **Questão importante**: responda";
    render(<AdaptedContentRenderer content={content} />);
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it("renders multiple blocks in correct order", () => {
    const content = "TÍTULO\n\n1. Primeira questão\na) A\nb) B\n\n- Dica 1\n- Dica 2\n\nTexto final.";
    render(<AdaptedContentRenderer content={content} />);
    expect(screen.getByText("TÍTULO")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Dica 1")).toBeInTheDocument();
    expect(screen.getByText("Texto final.")).toBeInTheDocument();
  });

  it("opens edit modal when edit paragraph button is clicked", () => {
    const content = "Texto editável aqui";
    const onChange = vi.fn();
    render(<AdaptedContentRenderer content={content} onContentChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Editar parágrafo"));
    expect(screen.getByText("Editar texto")).toBeInTheDocument();
  });

  it("opens edit modal when edit list button is clicked", () => {
    const content = "- Item editável";
    const onChange = vi.fn();
    render(<AdaptedContentRenderer content={content} onContentChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Editar lista"));
    expect(screen.getByText("Editar texto")).toBeInTheDocument();
  });
});

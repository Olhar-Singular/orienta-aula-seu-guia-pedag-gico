import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ActivityStatusBar from "@/components/editor/ActivityStatusBar";

describe("ActivityStatusBar", () => {
  it("returns null when text has no questions and no unrecognized lines", () => {
    const { container } = render(<ActivityStatusBar text="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a 'questão(ões)' chip counting parsed questions", () => {
    const text = [
      "1. Qual é a capital do Brasil?",
      "2. Quanto é 2+2?",
    ].join("\n");
    const { getByText } = render(<ActivityStatusBar text={text} />);
    expect(getByText(/2 questão\(ões\)/)).toBeInTheDocument();
  });

  it("renders the 'discursiva' chip when open-ended questions are present", () => {
    const { getByText } = render(
      <ActivityStatusBar text="1. Escreva sobre o tema." />
    );
    expect(getByText(/discursiva/)).toBeInTheDocument();
  });

  it("renders the 'múltipla' chip for multiple-choice questions", () => {
    const text = [
      "1. Escolha a correta:",
      "a) A",
      "b) B",
      "c) C",
    ].join("\n");
    const { getByText } = render(<ActivityStatusBar text={text} />);
    expect(getByText(/múltipla/)).toBeInTheDocument();
  });

  it("shows a warning chip when a multiple-choice question has fewer than 2 alternatives", () => {
    const text = ["1. Escolha:", "a) Única alternativa"].join("\n");
    const { getByText } = render(<ActivityStatusBar text={text} />);
    // The warning text contains the question number prefix "Q1".
    expect(getByText(/^Q1:/)).toBeInTheDocument();
  });
});

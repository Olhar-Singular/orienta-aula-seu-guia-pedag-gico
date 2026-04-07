import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import ActivityPreview from "@/components/editor/ActivityPreview";

beforeAll(() => {
  // jsdom does not implement scrollIntoView
  Element.prototype.scrollIntoView = () => {};
});

describe("ActivityPreview", () => {
  describe("multiple images", () => {
    it("renders multiple images for a single question", () => {
      const text =
        "1) Observe as figuras.\n[img:https://example.com/a.png]\n[img:https://example.com/b.png]";
      render(<ActivityPreview text={text} />);
      const imgs = screen.getAllByAltText("Imagem da questão");
      expect(imgs).toHaveLength(2);
    });

    it("renders no images when question has none", () => {
      const text = "1) Sem imagem.";
      render(<ActivityPreview text={text} />);
      expect(screen.queryByAltText("Imagem da questão")).toBeNull();
    });
  });

  describe("image registry", () => {
    it("resolves registry reference to actual URL", () => {
      const text = "1) Observe.\n[img:imagem-1]";
      const registry = { "imagem-1": "https://real-url.com/photo.jpg" };
      render(<ActivityPreview text={text} imageRegistry={registry} />);
      const img = screen.getByAltText("Imagem da questão");
      expect(img).toHaveAttribute("src", "https://real-url.com/photo.jpg");
    });

    it("shows reference badge when not resolvable to URL", () => {
      const text = "1) Observe.\n[img:imagem-99]";
      render(<ActivityPreview text={text} imageRegistry={{}} />);
      expect(screen.getByText("imagem-99")).toBeInTheDocument();
      expect(screen.queryByAltText("Imagem da questão")).toBeNull();
    });
  });

  describe("active question highlight", () => {
    it("applies active styling to matching question number", () => {
      const text = "1) Questao um.\n\n2) Questao dois.";
      const { container } = render(
        <ActivityPreview text={text} activeQuestion={2} />
      );
      const cards = container.querySelectorAll("[class*='border']");
      // The second question card should have violet border
      const activeCard = Array.from(cards).find((el) =>
        el.className.includes("border-violet-400")
      );
      expect(activeCard).toBeDefined();
      expect(activeCard!.textContent).toContain("Questao dois");
    });

    it("does not highlight when activeQuestion is null", () => {
      const text = "1) Questao um.";
      const { container } = render(
        <ActivityPreview text={text} activeQuestion={null} />
      );
      const violetCards = container.querySelectorAll(
        "[class*='border-violet-400']"
      );
      expect(violetCards).toHaveLength(0);
    });
  });

  describe("empty state", () => {
    it("shows empty state for blank text", () => {
      render(<ActivityPreview text="" />);
      expect(screen.getByText(/prévia aparece/i)).toBeInTheDocument();
    });
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ContextIndicator from "@/components/adaptation/ContextIndicator";

describe("ContextIndicator", () => {
  it("renders all pillar labels", () => {
    render(
      <ContextIndicator
        hasBarriers={false}
        hasPEI={false}
        hasDocuments={false}
        hasChatHistory={false}
        hasActivityContext={false}
      />
    );
    expect(screen.getByText("Barreiras")).toBeInTheDocument();
    expect(screen.getByText("PEI")).toBeInTheDocument();
    expect(screen.getByText("Documentos")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Atividade")).toBeInTheDocument();
  });

  it("renders 'Pilares utilizados:' label", () => {
    render(
      <ContextIndicator
        hasBarriers={false}
        hasPEI={false}
        hasDocuments={false}
        hasChatHistory={false}
        hasActivityContext={false}
      />
    );
    expect(screen.getByText("Pilares utilizados:")).toBeInTheDocument();
  });

  it("applies active styling when pillars are true", () => {
    const { container } = render(
      <ContextIndicator
        hasBarriers={true}
        hasPEI={true}
        hasDocuments={false}
        hasChatHistory={false}
        hasActivityContext={false}
      />
    );
    // Active pillars should have primary styling
    const barreirasEl = screen.getByText("Barreiras").closest("div");
    expect(barreirasEl?.className).toContain("bg-primary/10");
  });

  it("applies inactive styling when pillars are false", () => {
    render(
      <ContextIndicator
        hasBarriers={false}
        hasPEI={false}
        hasDocuments={false}
        hasChatHistory={false}
        hasActivityContext={false}
      />
    );
    const barreirasEl = screen.getByText("Barreiras").closest("div");
    expect(barreirasEl?.className).toContain("bg-muted");
  });

  it("renders all pillars as active when all true", () => {
    render(
      <ContextIndicator
        hasBarriers={true}
        hasPEI={true}
        hasDocuments={true}
        hasChatHistory={true}
        hasActivityContext={true}
      />
    );
    const pillars = ["Barreiras", "PEI", "Documentos", "Chat", "Atividade"];
    pillars.forEach((label) => {
      const el = screen.getByText(label).closest("div");
      expect(el?.className).toContain("bg-primary/10");
    });
  });
});

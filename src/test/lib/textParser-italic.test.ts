import { describe, it, expect } from "vitest";
import { normalizeMathText } from "@/lib/pdf/textParser";

describe("normalizeMathText – italic markdown stripping", () => {
  it("removes italic underscore markers", () => {
    const result = normalizeMathText("Texto com _itálico_ aqui");
    expect(result).not.toContain("_itálico_");
    expect(result).toContain("itálico");
  });

  it("removes italic asterisk markers", () => {
    const result = normalizeMathText("Texto com *itálico* aqui");
    expect(result).not.toContain("*itálico*");
    expect(result).toContain("itálico");
  });

  it("handles parentheses with italic", () => {
    const result = normalizeMathText("(_Pergunta importante?_)");
    expect(result).toContain("Pergunta importante?");
    expect(result).not.toContain("_Pergunta");
  });

  it("preserves snake_case identifiers", () => {
    const result = normalizeMathText("Use variavel_nome no código");
    expect(result).toContain("variavel_nome");
  });
});

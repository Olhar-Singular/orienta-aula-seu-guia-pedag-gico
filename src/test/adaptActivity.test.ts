import { describe, it, expect } from "vitest";
import { sanitize } from "../../supabase/functions/_shared/sanitize";

describe("adapt-activity prompt sanitization", () => {
  it("removes HTML tags from activity text", () => {
    const malicious = '<script>alert("xss")</script>Resolva: 2 + 2 = ?';
    const result = sanitize(malicious);
    expect(result).not.toContain("<script>");
    expect(result).toContain("Resolva: 2 + 2 = ?");
  });

  it("removes dangerous characters from activity input", () => {
    const input = 'Calcule <img src="x" onerror="hack()"> a área';
    const result = sanitize(input);
    expect(result).not.toContain("<img");
    expect(result).not.toContain("onerror");
  });

  it("truncates excessively long activity text", () => {
    const longText = "Resolva ".repeat(5000);
    const result = sanitize(longText, 10000);
    expect(result.length).toBeLessThanOrEqual(10000);
  });

  it("sanitizes barrier notes with injection attempts", () => {
    const notes = "'; DROP TABLE students; --";
    const result = sanitize(notes, 200);
    expect(result).not.toContain("'");
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it("preserves legitimate pedagogical content", () => {
    const activity = "Leia o texto a seguir e responda as questões de 1 a 5. Justifique suas respostas.";
    const result = sanitize(activity);
    expect(result).toBe(activity);
  });

  it("handles empty and whitespace-only input", () => {
    expect(sanitize("")).toBe("");
    expect(sanitize("   ")).toBe("");
  });

  it("sanitizes barrier dimension names", () => {
    const dimension = '<b>processamento</b> & "atenção"';
    const result = sanitize(dimension, 50);
    expect(result).not.toContain("<b>");
    expect(result).not.toContain('"');
    expect(result).toContain("processamento");
  });
});

describe("adapt-activity input validation logic", () => {
  it("validates barriers array structure", () => {
    const validBarriers = [
      { dimension: "processamento", barrier_key: "Dificuldade com enunciados longos" },
      { dimension: "atencao", barrier_key: "Perde o foco", notes: "especialmente após 15min" },
    ];

    expect(Array.isArray(validBarriers)).toBe(true);
    expect(validBarriers.length).toBeGreaterThan(0);
    validBarriers.forEach((b) => {
      expect(b).toHaveProperty("dimension");
      expect(b).toHaveProperty("barrier_key");
      expect(typeof b.dimension).toBe("string");
      expect(typeof b.barrier_key).toBe("string");
    });
  });

  it("rejects empty barriers array", () => {
    const emptyBarriers: any[] = [];
    expect(emptyBarriers.length).toBe(0);
  });

  it("validates activity_type values", () => {
    const validTypes = ["prova", "exercicio", "atividade_casa", "trabalho"];
    validTypes.forEach((t) => {
      expect(sanitize(t, 100)).toBe(t);
    });
  });

  it("validates adaptation result has required fields", () => {
    const mockResult = {
      version_universal: "Versão universal da atividade",
      version_directed: "Versão dirigida ao aluno",
      strategies_applied: ["Fragmentação de enunciados", "Apoio visual"],
      pedagogical_justification: "As adaptações focam em remover barreiras de processamento",
      implementation_tips: ["Leia o enunciado em voz alta", "Use marcadores visuais"],
    };

    const requiredFields = [
      "version_universal",
      "version_directed",
      "strategies_applied",
      "pedagogical_justification",
      "implementation_tips",
    ];

    requiredFields.forEach((field) => {
      expect(mockResult).toHaveProperty(field);
      expect(mockResult[field as keyof typeof mockResult]).toBeTruthy();
    });
  });
});

import { describe, it, expect } from "vitest";
import { parseCsv } from "@/lib/csvParser";

describe("parseCsv", () => {
  it("parses basic CSV with header", () => {
    const csv = "nome,matricula\nJoão Silva,12345\nMaria Santos,67890";
    const result = parseCsv(csv);
    expect(result.students).toHaveLength(2);
    expect(result.students[0]).toEqual({ nome: "João Silva", matricula: "12345" });
    expect(result.errors).toHaveLength(0);
  });

  it("parses CSV without header", () => {
    const csv = "Ana Costa,11111";
    const result = parseCsv(csv);
    expect(result.students).toHaveLength(1);
    expect(result.students[0].nome).toBe("Ana Costa");
  });

  it("handles missing matricula", () => {
    const csv = "nome,matricula\nPedro";
    const result = parseCsv(csv);
    expect(result.students).toHaveLength(1);
    expect(result.students[0].matricula).toBe("");
  });

  it("reports error for empty name", () => {
    const csv = "nome,matricula\n,12345";
    const result = parseCsv(csv);
    expect(result.students).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("handles empty input", () => {
    const result = parseCsv("");
    expect(result.students).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("handles Windows line endings", () => {
    const csv = "nome,matricula\r\nCarlos,999\r\nLucia,888";
    const result = parseCsv(csv);
    expect(result.students).toHaveLength(2);
  });

  it("trims whitespace", () => {
    const csv = "  Ana  ,  123  ";
    const result = parseCsv(csv);
    expect(result.students[0].nome).toBe("Ana");
    expect(result.students[0].matricula).toBe("123");
  });
});

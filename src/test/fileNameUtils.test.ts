import { describe, it, expect } from "vitest";
import { resolveUniqueFileName } from "@/lib/fileNameUtils";

describe("resolveUniqueFileName", () => {
  it("returns original name when no collision", () => {
    const result = resolveUniqueFileName("prova.pdf", []);
    expect(result).toEqual({ finalName: "prova.pdf", wasRenamed: false });
  });

  it("returns original when existing list does not contain the name", () => {
    const result = resolveUniqueFileName("prova.pdf", ["outra.pdf", "diferente.docx"]);
    expect(result).toEqual({ finalName: "prova.pdf", wasRenamed: false });
  });

  it("appends (1) on single collision", () => {
    const result = resolveUniqueFileName("prova.pdf", ["prova.pdf"]);
    expect(result).toEqual({ finalName: "prova (1).pdf", wasRenamed: true });
  });

  it("increments suffix when (1) already taken", () => {
    const result = resolveUniqueFileName("prova.pdf", ["prova.pdf", "prova (1).pdf"]);
    expect(result).toEqual({ finalName: "prova (2).pdf", wasRenamed: true });
  });

  it("finds next free slot when there are gaps", () => {
    const result = resolveUniqueFileName("prova.pdf", [
      "prova.pdf",
      "prova (1).pdf",
      "prova (3).pdf",
    ]);
    expect(result).toEqual({ finalName: "prova (2).pdf", wasRenamed: true });
  });

  it("handles file without extension", () => {
    const result = resolveUniqueFileName("README", ["README"]);
    expect(result).toEqual({ finalName: "README (1)", wasRenamed: true });
  });

  it("treats only the last extension as extension (double extensions)", () => {
    const result = resolveUniqueFileName("prova.tar.gz", ["prova.tar.gz"]);
    expect(result).toEqual({ finalName: "prova.tar (1).gz", wasRenamed: true });
  });

  it("is case-insensitive when comparing", () => {
    const result = resolveUniqueFileName("Prova.PDF", ["prova.pdf"]);
    expect(result.wasRenamed).toBe(true);
    expect(result.finalName).toBe("Prova (1).PDF");
  });

  it("preserves original casing in the returned name", () => {
    const result = resolveUniqueFileName("MinhaProva.Pdf", ["minhaprova.pdf"]);
    expect(result.finalName).toBe("MinhaProva (1).Pdf");
  });

  it("handles names that already look like renamed copies", () => {
    const result = resolveUniqueFileName("prova (1).pdf", ["prova (1).pdf"]);
    expect(result).toEqual({ finalName: "prova (1) (1).pdf", wasRenamed: true });
  });

  it("handles leading/trailing dots defensively", () => {
    const result = resolveUniqueFileName(".hidden", [".hidden"]);
    expect(result).toEqual({ finalName: ".hidden (1)", wasRenamed: true });
  });
});

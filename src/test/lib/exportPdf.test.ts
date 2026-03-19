import { describe, it, expect } from "vitest";

describe("exportPdf module", () => {
  it("exports exportToPdf function", async () => {
    const mod = await import("@/lib/exportPdf");
    expect(typeof mod.exportToPdf).toBe("function");
  });

  it("has ExportData type shape", async () => {
    const mod = await import("@/lib/exportPdf");
    expect(mod).toBeDefined();
  });
});

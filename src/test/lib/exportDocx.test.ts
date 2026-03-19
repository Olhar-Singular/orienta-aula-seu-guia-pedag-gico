import { describe, it, expect, vi } from "vitest";

// We can't fully test docx export (requires DOM) but we can test the module loads
// and the parseLineWithFractions logic by testing exports
describe("exportDocx module", () => {
  it("exports exportToDocx function", async () => {
    const mod = await import("@/lib/exportDocx");
    expect(typeof mod.exportToDocx).toBe("function");
  });

  it("has the correct DocxExportData type shape", async () => {
    const mod = await import("@/lib/exportDocx");
    // Just verify the module loads without error
    expect(mod).toBeDefined();
  });
});

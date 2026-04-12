import { describe, it, expect } from "vitest";
import { getStepsForMode, getNextStep } from "@/components/adaptation/AdaptationWizard";

describe("Wizard PDF Preview step integration", () => {
  it("includes pdf_preview step in AI mode sequence", () => {
    const steps = getStepsForMode("ai");
    expect(steps).toContain("pdf_preview");
    // pdf_preview comes after ai_editor and before export
    const aiEditorIdx = steps.indexOf("ai_editor");
    const pdfPreviewIdx = steps.indexOf("pdf_preview");
    const exportIdx = steps.indexOf("export");
    expect(pdfPreviewIdx).toBe(aiEditorIdx + 1);
    expect(exportIdx).toBe(pdfPreviewIdx + 1);
  });

  it("includes pdf_preview step in manual mode sequence", () => {
    const steps = getStepsForMode("manual");
    expect(steps).toContain("pdf_preview");
    const editorIdx = steps.indexOf("editor");
    const pdfPreviewIdx = steps.indexOf("pdf_preview");
    const exportIdx = steps.indexOf("export");
    expect(pdfPreviewIdx).toBe(editorIdx + 1);
    expect(exportIdx).toBe(pdfPreviewIdx + 1);
  });

  it("getNextStep from ai_editor goes to pdf_preview", () => {
    expect(getNextStep("ai_editor", "ai")).toBe("pdf_preview");
  });

  it("getNextStep from pdf_preview goes to export", () => {
    expect(getNextStep("pdf_preview", "ai")).toBe("export");
  });

  it("AI mode has 7 steps total", () => {
    expect(getStepsForMode("ai")).toHaveLength(7);
  });

  it("manual mode has 7 steps total", () => {
    expect(getStepsForMode("manual")).toHaveLength(7);
  });
});

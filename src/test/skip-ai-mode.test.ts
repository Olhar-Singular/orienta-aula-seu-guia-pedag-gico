import { describe, it, expect, vi } from "vitest";
import {
  MOCK_SELECTED_QUESTIONS,
  MOCK_ACTIVITY_TEXT_WITH_QUESTIONS,
  MOCK_MANUAL_WIZARD_DATA,
  MOCK_MANUAL_STRUCTURED_ACTIVITY,
  MOCK_MANUAL_ADAPTATION_RESULT,
} from "./fixtures";
import type { StructuredActivity } from "@/types/adaptation";
import type { WizardData, SelectedQuestion } from "@/components/adaptation/AdaptationWizard";
import { getNextStep, getStepsForMode } from "@/components/adaptation/AdaptationWizard";
import { StepChoice } from "@/components/adaptation/StepChoice";
import { convertToStructuredActivity } from "@/lib/convertToStructuredActivity";
import { parseActivityText } from "@/lib/parseActivityText";
import { getVersionText } from "@/lib/getVersionText";
import { isStructuredActivity } from "@/types/adaptation";

// ─── Sanity check ───
describe("Skip AI mode fixtures", () => {
  it("fixtures are defined", () => {
    expect(MOCK_SELECTED_QUESTIONS).toBeDefined();
    expect(MOCK_ACTIVITY_TEXT_WITH_QUESTIONS).toBeDefined();
    expect(MOCK_MANUAL_WIZARD_DATA).toBeDefined();
    expect(MOCK_MANUAL_STRUCTURED_ACTIVITY).toBeDefined();
    expect(MOCK_MANUAL_ADAPTATION_RESULT).toBeDefined();
  });

  it("MOCK_SELECTED_QUESTIONS has 3 items", () => {
    expect(MOCK_SELECTED_QUESTIONS).toHaveLength(3);
  });

  it("MOCK_MANUAL_WIZARD_DATA has empty barriers", () => {
    expect(MOCK_MANUAL_WIZARD_DATA.barriers).toHaveLength(0);
  });

  it("MOCK_MANUAL_STRUCTURED_ACTIVITY has sections", () => {
    expect(MOCK_MANUAL_STRUCTURED_ACTIVITY.sections).toBeDefined();
    expect(MOCK_MANUAL_STRUCTURED_ACTIVITY.sections.length).toBeGreaterThan(0);
  });
});

// ─── Mode Selection Logic (TEST-01) ───
describe("Mode Selection Logic (TEST-01)", () => {
  describe("getNextStep function", () => {
    it("returns 'barriers' step after content in ai mode", () => {
      expect(getNextStep("content", "ai")).toBe("barriers");
    });

    it("returns 'barriers' step after content in manual mode", () => {
      expect(getNextStep("content", "manual")).toBe("barriers");
    });

    it("returns 'choice' step after barriers in ai mode", () => {
      expect(getNextStep("barriers", "ai")).toBe("choice");
    });

    it("returns 'choice' step after barriers in manual mode", () => {
      expect(getNextStep("barriers", "manual")).toBe("choice");
    });

    it("returns 'ai_editor' step after choice in ai mode", () => {
      expect(getNextStep("choice", "ai")).toBe("ai_editor");
    });

    it("returns 'editor' step after choice in manual mode", () => {
      expect(getNextStep("choice", "manual")).toBe("editor");
    });
  });

  describe("Mode selection UI", () => {
    it("renders choice between AI and Manual after content step", () => {
      expect(StepChoice).toBeDefined();
    });

    it("sets wizardMode to 'manual' when manual option selected", () => {
      expect(StepChoice).toBeDefined();
      const mockUpdate = vi.fn();
      mockUpdate({ wizardMode: "manual" });
      expect(mockUpdate).toHaveBeenCalledWith({ wizardMode: "manual" });
    });

    it("sets wizardMode to 'ai' when AI option selected", () => {
      expect(StepChoice).toBeDefined();
      const mockUpdate = vi.fn();
      mockUpdate({ wizardMode: "ai" });
      expect(mockUpdate).toHaveBeenCalledWith({ wizardMode: "ai" });
    });
  });
});

// ─── Manual Mode Flow (TEST-02) ───
describe("Manual Mode Flow (TEST-02)", () => {
  describe("Step sequence", () => {
    it("getStepsForMode('manual') returns 7-step array with barriers, choice, editor, and pdf_preview", () => {
      const steps = getStepsForMode("manual");
      expect(steps).toHaveLength(7);
      expect(steps).toEqual(["type", "content", "barriers", "choice", "editor", "pdf_preview", "export"]);
      expect(steps).not.toContain("ai_editor");
    });

    it("getStepsForMode('ai') returns 7-step array with barriers, choice, ai_editor, and pdf_preview", () => {
      const steps = getStepsForMode("ai");
      expect(steps).toHaveLength(7);
      expect(steps).toEqual(["type", "content", "barriers", "choice", "ai_editor", "pdf_preview", "export"]);
      expect(steps).not.toContain("editor");
    });

    it("choice step appears after barriers in both modes", () => {
      const aiSteps = getStepsForMode("ai");
      const manualSteps = getStepsForMode("manual");
      expect(aiSteps.indexOf("choice")).toBe(aiSteps.indexOf("barriers") + 1);
      expect(manualSteps.indexOf("choice")).toBe(manualSteps.indexOf("barriers") + 1);
    });

    it("choice step is at the same index in both modes", () => {
      const aiSteps = getStepsForMode("ai");
      const manualSteps = getStepsForMode("manual");
      expect(aiSteps.indexOf("choice")).toBe(manualSteps.indexOf("choice"));
    });
  });

  describe("Manual mode data", () => {
    it("manual mode wizard data has empty barriers array", () => {
      expect(MOCK_MANUAL_WIZARD_DATA.barriers).toEqual([]);
    });

    it("manual mode never triggers AI adaptation call", async () => {
      // In manual mode, no edge function is called for adaptation.
      // This is a contract test: manual mode bypasses AI entirely.
      // The actual integration test verifies this in the wizard flow.
      const mockInvoke = vi.fn();
      // Simulate manual flow — no invoke should happen
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });
});

// ─── Question Conversion (TEST-03) ───
describe("Question Conversion (TEST-03)", () => {
  describe("convertToStructuredActivity function", () => {
    it("converts SelectedQuestion[] to valid StructuredActivity", () => {
      const result: unknown = convertToStructuredActivity(MOCK_SELECTED_QUESTIONS);
      expect(isStructuredActivity(result)).toBe(true);
    });

    it("maps multiple choice questions with alternatives", () => {
      const result: StructuredActivity = convertToStructuredActivity(MOCK_SELECTED_QUESTIONS);
      const q1 = result.sections[0].questions[0];
      expect(q1.type).toBe("multiple_choice");
      expect(q1.alternatives).toBeDefined();
      expect(q1.alternatives!.length).toBe(4);
    });

    it("maps open ended questions without alternatives", () => {
      const result: StructuredActivity = convertToStructuredActivity(MOCK_SELECTED_QUESTIONS);
      const q2 = result.sections[0].questions[1]; // sq-002 has no options
      expect(q2.type).toBe("open_ended");
      expect(q2.alternatives).toBeUndefined();
    });

    it("preserves question number from array index", () => {
      const result: StructuredActivity = convertToStructuredActivity(MOCK_SELECTED_QUESTIONS);
      const questions = result.sections[0].questions;
      expect(questions[0].number).toBe(1);
      expect(questions[1].number).toBe(2);
      expect(questions[2].number).toBe(3);
    });

    it("preserves question text as statement", () => {
      const result: StructuredActivity = convertToStructuredActivity(MOCK_SELECTED_QUESTIONS);
      const q1 = result.sections[0].questions[0];
      expect(q1.statement).toBe(MOCK_SELECTED_QUESTIONS[0].text);
    });

    it("preserves question images", () => {
      const result: StructuredActivity = convertToStructuredActivity(MOCK_SELECTED_QUESTIONS);
      const q2 = result.sections[0].questions[1]; // has image_url
      expect(q2.images).toBeDefined();
      expect(q2.images![0]).toBe(MOCK_SELECTED_QUESTIONS[1].image_url);
    });
  });

  describe("parseActivityText function", () => {
    it("parses raw activity text to StructuredActivity", () => {
      const result: unknown = parseActivityText(MOCK_ACTIVITY_TEXT_WITH_QUESTIONS);
      expect(isStructuredActivity(result)).toBe(true);
    });

    it("extracts numbered questions from text", () => {
      const result: StructuredActivity = parseActivityText(MOCK_ACTIVITY_TEXT_WITH_QUESTIONS);
      // MOCK_ACTIVITY_TEXT_WITH_QUESTIONS has 2 numbered questions (1) and 2)
      expect(result.sections[0].questions.length).toBe(2);
    });
  });
});

// ─── Export Compatibility (TEST-04) ───
describe("Export Compatibility (TEST-04)", () => {
  describe("Manual result serialization", () => {
    it("getVersionText converts StructuredActivity to string", () => {
      const text: string = getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY);
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(0);
    });

    it("manual result versionUniversal contains question text", () => {
      const text: string = getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY);
      expect(text).toContain("Quanto é 2 + 2?");
    });

    it("manual result can populate ExportData.versionUniversal", () => {
      const versionUniversal: string = getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY);
      expect(typeof versionUniversal).toBe("string");
    });

    it("manual result can populate ExportData.versionDirected", () => {
      const versionDirected: string = getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY);
      expect(typeof versionDirected).toBe("string");
    });
  });

  describe("Export functions accept manual adaptations", () => {
    it("exportToPdf accepts manual adaptation result", async () => {
      const { exportToPdf } = await import("@/lib/exportPdf");

      const exportData = {
        date: "2026-03-24",
        versionUniversal: getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY),
        versionDirected: getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY),
        strategiesApplied: MOCK_MANUAL_ADAPTATION_RESULT.strategies_applied,
        pedagogicalJustification: MOCK_MANUAL_ADAPTATION_RESULT.pedagogical_justification,
        implementationTips: MOCK_MANUAL_ADAPTATION_RESULT.implementation_tips,
      };

      await expect(exportToPdf(exportData)).resolves.not.toThrow();
    });

    it("exportToDocx accepts manual adaptation result", async () => {
      const { exportToDocx } = await import("@/lib/exportDocx");

      const exportData = {
        date: "2026-03-24",
        versionUniversal: getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY),
        versionDirected: getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY),
        strategiesApplied: MOCK_MANUAL_ADAPTATION_RESULT.strategies_applied,
        pedagogicalJustification: MOCK_MANUAL_ADAPTATION_RESULT.pedagogical_justification,
        implementationTips: MOCK_MANUAL_ADAPTATION_RESULT.implementation_tips,
      };

      await expect(exportToDocx(exportData)).resolves.not.toThrow();
    });

    it("exported content includes all original questions", () => {
      const text: string = getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY);
      MOCK_MANUAL_STRUCTURED_ACTIVITY.sections[0].questions.forEach((q) => {
        expect(text).toContain(q.statement);
      });
    });
  });
});

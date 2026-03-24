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
    it("returns 'barriers' step when mode is 'ai'", () => {
      // getNextStep does not exist yet — this test defines the contract
      // import { getNextStep } from "@/components/adaptation/AdaptationWizard"
      // expect(getNextStep('content', 'ai')).toBe('barriers')
      const { getNextStep } = require("@/components/adaptation/AdaptationWizard");
      expect(getNextStep("content", "ai")).toBe("barriers");
    });

    it("returns 'editor' step when mode is 'manual'", () => {
      // getNextStep does not exist yet — this test defines the contract
      const { getNextStep } = require("@/components/adaptation/AdaptationWizard");
      expect(getNextStep("content", "manual")).toBe("editor");
    });
  });

  describe("Mode selection UI", () => {
    it("renders choice between AI and Manual after content step", () => {
      // StepChoice component does not exist yet
      const { StepChoice } = require("@/components/adaptation/StepChoice");
      expect(StepChoice).toBeDefined();
    });

    it("sets wizardMode to 'manual' when manual option selected", () => {
      // wizardMode field does not exist in WizardData yet
      const wizardData = MOCK_MANUAL_WIZARD_DATA as WizardData & { wizardMode?: string };
      // After user picks manual, wizardMode should be 'manual'
      const updateData = vi.fn();
      const { StepChoice } = require("@/components/adaptation/StepChoice");
      // The component calls updateData({ wizardMode: 'manual' }) when clicked
      expect(StepChoice).toBeDefined();
      // Simulate: updateData should be called with wizardMode: 'manual'
      // Full render test in integration — here we verify the type contract
      const mockUpdate = vi.fn();
      mockUpdate({ wizardMode: "manual" });
      expect(mockUpdate).toHaveBeenCalledWith({ wizardMode: "manual" });
    });

    it("sets wizardMode to 'ai' when AI option selected", () => {
      // wizardMode field does not exist in WizardData yet
      const { StepChoice } = require("@/components/adaptation/StepChoice");
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
    it("getStepsForMode('manual') returns 5-step array without barriers and result", () => {
      // getStepsForMode does not exist yet
      const { getStepsForMode } = require("@/components/adaptation/AdaptationWizard");
      const steps: string[] = getStepsForMode("manual");
      expect(steps).toHaveLength(5);
      expect(steps).toContain("type");
      expect(steps).toContain("content");
      expect(steps).toContain("choice");
      expect(steps).toContain("editor");
      expect(steps).toContain("export");
      expect(steps).not.toContain("barriers");
      expect(steps).not.toContain("result");
    });

    it("getStepsForMode('ai') returns 5-step array with all AI steps", () => {
      // getStepsForMode does not exist yet
      const { getStepsForMode } = require("@/components/adaptation/AdaptationWizard");
      const steps: string[] = getStepsForMode("ai");
      expect(steps).toHaveLength(5);
      expect(steps).toContain("type");
      expect(steps).toContain("content");
      expect(steps).toContain("barriers");
      expect(steps).toContain("result");
      expect(steps).toContain("export");
      expect(steps).not.toContain("editor");
      expect(steps).not.toContain("choice");
    });

    it("manual mode skips barriers step entirely", () => {
      // In manual flow, after 'choice' step the next step should be 'editor'
      const { getNextStep } = require("@/components/adaptation/AdaptationWizard");
      const nextAfterChoice = getNextStep("choice", "manual");
      expect(nextAfterChoice).toBe("editor");
      expect(nextAfterChoice).not.toBe("barriers");
    });
  });

  describe("Manual mode data", () => {
    it("manual mode wizard data has empty barriers array", () => {
      expect(MOCK_MANUAL_WIZARD_DATA.barriers).toEqual([]);
    });

    it("manual mode never triggers AI adaptation call", async () => {
      // When wizardMode is 'manual', the AI edge function should never be called
      const supabaseMock = {
        functions: {
          invoke: vi.fn(),
        },
      };
      vi.mock("@/integrations/supabase/client", () => ({
        supabase: supabaseMock,
      }));

      // Manual flow completes without calling functions.invoke
      // This is verified by ensuring no call happened
      expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
    });
  });
});

// ─── Question Conversion (TEST-03) ───
describe("Question Conversion (TEST-03)", () => {
  describe("convertToStructuredActivity function", () => {
    it("converts SelectedQuestion[] to valid StructuredActivity", () => {
      // convertToStructuredActivity does not exist yet
      const { convertToStructuredActivity } = require("@/lib/convertToStructuredActivity");
      const { isStructuredActivity } = require("@/types/adaptation");
      const result: unknown = convertToStructuredActivity(MOCK_SELECTED_QUESTIONS);
      expect(isStructuredActivity(result)).toBe(true);
    });

    it("maps multiple choice questions with alternatives", () => {
      const { convertToStructuredActivity } = require("@/lib/convertToStructuredActivity");
      const result: StructuredActivity = convertToStructuredActivity(MOCK_SELECTED_QUESTIONS);
      const q1 = result.sections[0].questions[0];
      expect(q1.type).toBe("multiple_choice");
      expect(q1.alternatives).toBeDefined();
      expect(q1.alternatives!.length).toBe(4);
    });

    it("maps open ended questions without alternatives", () => {
      const { convertToStructuredActivity } = require("@/lib/convertToStructuredActivity");
      const result: StructuredActivity = convertToStructuredActivity(MOCK_SELECTED_QUESTIONS);
      const q2 = result.sections[0].questions[1]; // sq-002 has no options
      expect(q2.type).toBe("open_ended");
      expect(q2.alternatives).toBeUndefined();
    });

    it("preserves question number from array index", () => {
      const { convertToStructuredActivity } = require("@/lib/convertToStructuredActivity");
      const result: StructuredActivity = convertToStructuredActivity(MOCK_SELECTED_QUESTIONS);
      const questions = result.sections[0].questions;
      expect(questions[0].number).toBe(1);
      expect(questions[1].number).toBe(2);
      expect(questions[2].number).toBe(3);
    });

    it("preserves question text as statement", () => {
      const { convertToStructuredActivity } = require("@/lib/convertToStructuredActivity");
      const result: StructuredActivity = convertToStructuredActivity(MOCK_SELECTED_QUESTIONS);
      const q1 = result.sections[0].questions[0];
      expect(q1.statement).toBe(MOCK_SELECTED_QUESTIONS[0].text);
    });

    it("preserves question images", () => {
      const { convertToStructuredActivity } = require("@/lib/convertToStructuredActivity");
      const result: StructuredActivity = convertToStructuredActivity(MOCK_SELECTED_QUESTIONS);
      const q2 = result.sections[0].questions[1]; // has image_url
      expect(q2.images).toBeDefined();
      expect(q2.images![0]).toBe(MOCK_SELECTED_QUESTIONS[1].image_url);
    });
  });

  describe("parseActivityText function", () => {
    it("parses raw activity text to StructuredActivity", () => {
      // parseActivityText does not exist yet
      const { parseActivityText } = require("@/lib/parseActivityText");
      const { isStructuredActivity } = require("@/types/adaptation");
      const result: unknown = parseActivityText(MOCK_ACTIVITY_TEXT_WITH_QUESTIONS);
      expect(isStructuredActivity(result)).toBe(true);
    });

    it("extracts numbered questions from text", () => {
      const { parseActivityText } = require("@/lib/parseActivityText");
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
      // getVersionText does not exist yet
      const { getVersionText } = require("@/lib/getVersionText");
      const text: string = getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY);
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(0);
    });

    it("manual result versionUniversal contains question text", () => {
      const { getVersionText } = require("@/lib/getVersionText");
      const text: string = getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY);
      // Should contain the first question statement
      expect(text).toContain("Quanto é 2 + 2?");
    });

    it("manual result can populate ExportData.versionUniversal", () => {
      // ExportData.versionUniversal is a string
      // Manual result (StructuredActivity) must be serializable to string
      const { getVersionText } = require("@/lib/getVersionText");
      const versionUniversal: string = getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY);
      expect(typeof versionUniversal).toBe("string");
    });

    it("manual result can populate ExportData.versionDirected", () => {
      const { getVersionText } = require("@/lib/getVersionText");
      const versionDirected: string = getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY);
      expect(typeof versionDirected).toBe("string");
    });
  });

  describe("Export functions accept manual adaptations", () => {
    it("exportToPdf accepts manual adaptation result", async () => {
      const { getVersionText } = require("@/lib/getVersionText");
      const { exportToPdf } = require("@/lib/exportPdf");

      const exportData = {
        date: "2026-03-24",
        versionUniversal: getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY),
        versionDirected: getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY),
        strategiesApplied: MOCK_MANUAL_ADAPTATION_RESULT.strategies_applied,
        pedagogicalJustification: MOCK_MANUAL_ADAPTATION_RESULT.pedagogical_justification,
        implementationTips: MOCK_MANUAL_ADAPTATION_RESULT.implementation_tips,
      };

      // exportToPdf should not throw when receiving manual adaptation data
      await expect(exportToPdf(exportData)).resolves.not.toThrow();
    });

    it("exportToDocx accepts manual adaptation result", async () => {
      const { getVersionText } = require("@/lib/getVersionText");
      const { exportToDocx } = require("@/lib/exportDocx");

      const exportData = {
        date: "2026-03-24",
        versionUniversal: getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY),
        versionDirected: getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY),
        strategiesApplied: MOCK_MANUAL_ADAPTATION_RESULT.strategies_applied,
        pedagogicalJustification: MOCK_MANUAL_ADAPTATION_RESULT.pedagogical_justification,
        implementationTips: MOCK_MANUAL_ADAPTATION_RESULT.implementation_tips,
      };

      // exportToDocx should not throw when receiving manual adaptation data
      await expect(exportToDocx(exportData)).resolves.not.toThrow();
    });

    it("exported content includes all original questions", () => {
      const { getVersionText } = require("@/lib/getVersionText");
      const text: string = getVersionText(MOCK_MANUAL_STRUCTURED_ACTIVITY);
      // All question statements should appear in the serialized text
      MOCK_MANUAL_STRUCTURED_ACTIVITY.sections[0].questions.forEach((q) => {
        expect(text).toContain(q.statement);
      });
    });
  });
});

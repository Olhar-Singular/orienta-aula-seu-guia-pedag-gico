/**
 * Integration Test: StepExport export routing
 *
 * Validates that handleExportSinglePdf branches correctly:
 *   - When editableActivity IS set → calls pdf() (new PreviewPdfDocument renderer)
 *   - When editableActivity is NOT set → shows destructive toast with an error message
 *
 * Same logic is tested symmetrically for editableActivityDirected / "PDF Direcionada".
 *
 * Important: @react-pdf/renderer is fully mocked to avoid canvas issues in jsdom.
 * exportToPdf (legacy) is tracked to confirm it is NOT invoked by the new path.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MOCK_ADAPTATION_RESULT } from "../fixtures";
import { mockAuthHook, createTestWrapper } from "../helpers";

// ── Hoisted spies — must use vi.hoisted() so they exist when vi.mock factories run ──

const { mockToBlob, mockPdf, mockExportToPdf, mockToast } = vi.hoisted(() => {
  const toBlob = vi.fn().mockResolvedValue(new Blob(["fake"], { type: "application/pdf" }));
  const pdf = vi.fn(() => ({ toBlob }));
  const exportToPdf = vi.fn();
  const toast = vi.fn();
  return { mockToBlob: toBlob, mockPdf: pdf, mockExportToPdf: exportToPdf, mockToast: toast };
});

// ── Mock registrations ───────────────────────────────────────────────────────

vi.mock("@/hooks/useAuth", () => mockAuthHook());

vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => ({ schoolId: "school-001" }),
}));

vi.mock("@react-pdf/renderer", () => ({
  pdf: mockPdf,
  Document: ({ children }: any) => children,
  Page: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  View: ({ children }: any) => children,
  Image: () => null,
  StyleSheet: { create: (s: any) => s },
  Font: { register: vi.fn() },
}));

vi.mock("@/lib/exportPdf", () => ({ exportToPdf: mockExportToPdf }));

vi.mock("@/lib/exportDocx", () => ({
  exportToDocx: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/shareToken", () => ({
  generateShareToken: () => "mock-token-123",
}));

vi.mock("@/hooks/use-toast", () => ({ toast: mockToast }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: { id: "new-adapt-001" }, error: null })
          ),
        })),
      })),
    })),
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: { access_token: "tok" } } })
      ),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    functions: { invoke: vi.fn() },
  },
}));

// Mock URL.createObjectURL / revokeObjectURL used by downloadBlob
globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-url");
globalThis.URL.revokeObjectURL = vi.fn();

import StepExport from "@/components/adaptation/StepExport";
import type { WizardData } from "@/components/adaptation/AdaptationWizard";
import type { EditableActivity } from "@/lib/pdf/editableActivity";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_EDITABLE_ACTIVITY: EditableActivity = {
  header: {
    schoolName: "Escola Municipal Exemplo",
    subject: "Matematica",
    teacherName: "Prof. Silva",
    className: "5A",
    date: "11/04/2026",
    showStudentLine: true,
  },
  globalShowSeparators: false,
  questions: [
    {
      id: "eq-1",
      number: 1,
      content: [{ id: "cb-1", type: "text", content: "Quanto e 2 + 3?" }],
      alternatives: ["a) 4", "b) 5", "c) 6"],
    },
  ],
};

function makeData(overrides: Partial<WizardData> = {}): WizardData {
  return {
    activityType: "prova" as const,
    activityText: "Calcule 2 + 3",
    selectedQuestions: [],
    classId: null,
    studentId: null,
    studentName: "Aluno",
    barriers: [],
    adaptForWholeClass: false,
    observationNotes: "",
    result: MOCK_ADAPTATION_RESULT,
    contextPillars: null,
    questionImages: { version_universal: {}, version_directed: {} },
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("StepExport – export routing via editableActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore the blob mock that clearAllMocks would reset
    mockToBlob.mockResolvedValue(new Blob(["fake"], { type: "application/pdf" }));
    mockPdf.mockReturnValue({ toBlob: mockToBlob });
  });

  describe("PDF Universal button", () => {
    it("calls pdf() (new renderer) when editableActivity is set", async () => {
      const Wrapper = createTestWrapper();
      const { getByText } = render(
        <StepExport
          data={makeData({ editableActivity: MOCK_EDITABLE_ACTIVITY })}
          onPrev={vi.fn()}
          onRestart={vi.fn()}
        />,
        { wrapper: Wrapper }
      );

      fireEvent.click(getByText("PDF Universal"));

      await waitFor(() => {
        expect(mockPdf).toHaveBeenCalledTimes(1);
        expect(mockToBlob).toHaveBeenCalledTimes(1);
      });

      // Legacy path must NOT have been called
      expect(mockExportToPdf).not.toHaveBeenCalled();
    });

    it("shows destructive toast when editableActivity is NOT set", async () => {
      const Wrapper = createTestWrapper();
      const { getByText } = render(
        <StepExport
          data={makeData({ editableActivity: undefined })}
          onPrev={vi.fn()}
          onRestart={vi.fn()}
        />,
        { wrapper: Wrapper }
      );

      fireEvent.click(getByText("PDF Universal"));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining("universal"),
            variant: "destructive",
          })
        );
      });

      // Neither renderer should have been invoked
      expect(mockPdf).not.toHaveBeenCalled();
      expect(mockExportToPdf).not.toHaveBeenCalled();
    });

    it("does NOT call pdf() when editableActivity is explicitly undefined", async () => {
      const Wrapper = createTestWrapper();
      const { getByText } = render(
        <StepExport
          data={makeData()}
          onPrev={vi.fn()}
          onRestart={vi.fn()}
        />,
        { wrapper: Wrapper }
      );

      fireEvent.click(getByText("PDF Universal"));

      await waitFor(() => {
        // Toast called, pdf not called
        expect(mockToast).toHaveBeenCalled();
      });
      expect(mockPdf).not.toHaveBeenCalled();
    });
  });

  describe("PDF Direcionada button", () => {
    it("calls pdf() when editableActivityDirected is set", async () => {
      const Wrapper = createTestWrapper();
      const { getByText } = render(
        <StepExport
          data={makeData({ editableActivityDirected: MOCK_EDITABLE_ACTIVITY })}
          onPrev={vi.fn()}
          onRestart={vi.fn()}
        />,
        { wrapper: Wrapper }
      );

      fireEvent.click(getByText("PDF Direcionada"));

      await waitFor(() => {
        expect(mockPdf).toHaveBeenCalledTimes(1);
        expect(mockToBlob).toHaveBeenCalledTimes(1);
      });

      expect(mockExportToPdf).not.toHaveBeenCalled();
    });

    it("shows destructive toast when editableActivityDirected is NOT set", async () => {
      const Wrapper = createTestWrapper();
      const { getByText } = render(
        <StepExport
          data={makeData({ editableActivityDirected: undefined })}
          onPrev={vi.fn()}
          onRestart={vi.fn()}
        />,
        { wrapper: Wrapper }
      );

      fireEvent.click(getByText("PDF Direcionada"));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining("direcionada"),
            variant: "destructive",
          })
        );
      });

      expect(mockPdf).not.toHaveBeenCalled();
    });
  });

  describe("renders correctly", () => {
    it("renders all export buttons regardless of editableActivity state", () => {
      const Wrapper = createTestWrapper();
      const { getByText } = render(
        <StepExport
          data={makeData()}
          onPrev={vi.fn()}
          onRestart={vi.fn()}
        />,
        { wrapper: Wrapper }
      );

      expect(getByText("PDF Universal")).toBeTruthy();
      expect(getByText("PDF Direcionada")).toBeTruthy();
      expect(getByText("Exportar Word")).toBeTruthy();
      expect(getByText("Salvar no Histórico")).toBeTruthy();
    });

    it("returns null when result is null", () => {
      const Wrapper = createTestWrapper();
      const { container } = render(
        <StepExport
          data={makeData({ result: null })}
          onPrev={vi.fn()}
          onRestart={vi.fn()}
        />,
        { wrapper: Wrapper }
      );

      expect(container.innerHTML).toBe("");
    });
  });
});

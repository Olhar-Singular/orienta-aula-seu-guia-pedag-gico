import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import {
  MOCK_USER,
  MOCK_ADAPTATION_RESULT,
} from "../fixtures";
import { mockAuthHook, createTestWrapper } from "../helpers";

// Mock hooks
vi.mock("@/hooks/useAuth", () => mockAuthHook());
vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => ({ schoolId: "school-001" }),
}));

// Track supabase calls
const mockInsert = vi.fn(() => ({
  select: vi.fn(() => ({
    single: vi.fn(() =>
      Promise.resolve({ data: { id: "new-adapt-001" }, error: null })
    ),
  })),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "adaptations_history") {
        return { insert: mockInsert };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: null })),
              })),
            })),
          })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      };
    }),
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: { access_token: "tok" } } })
      ),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

// Mock exports to avoid DOM issues
vi.mock("@/lib/exportPdf", () => ({
  exportToPdf: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/exportDocx", () => ({
  exportToDocx: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/shareToken", () => ({
  generateShareToken: () => "mock-token-123",
}));

import StepExport from "@/components/adaptation/StepExport";
import type { WizardData } from "@/components/adaptation/AdaptationWizard";

const makeWizardData = (overrides: Partial<WizardData> = {}): WizardData => ({
  activityType: "exercicio",
  activityText: "Calcule 2 + 2",
  selectedQuestions: [],
  classId: "class-001",
  studentId: "student-001",
  studentName: "João Pedro",
  barriers: [
    { dimension: "tea", barrier_key: "tea_abstracao", label: "Abstração", is_active: true },
  ],
  adaptForWholeClass: false,
  observationNotes: "",
  result: MOCK_ADAPTATION_RESULT,
  contextPillars: null,
  questionImages: { version_universal: {}, version_directed: {} },
  ...overrides,
});

describe("StepExport – Save to History", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders save, PDF, and DOCX buttons", () => {
    const Wrapper = createTestWrapper();
    const { getByText } = render(
      <StepExport
        data={makeWizardData()}
        onPrev={vi.fn()}
        onRestart={vi.fn()}
      />,
      { wrapper: Wrapper }
    );

    expect(getByText("Salvar no Histórico")).toBeTruthy();
    expect(getByText("Exportar PDF")).toBeTruthy();
    expect(getByText("Exportar Word")).toBeTruthy();
  });

  it("calls supabase insert on save click", async () => {
    const Wrapper = createTestWrapper();
    const { getByText } = render(
      <StepExport
        data={makeWizardData()}
        onPrev={vi.fn()}
        onRestart={vi.fn()}
      />,
      { wrapper: Wrapper }
    );

    fireEvent.click(getByText("Salvar no Histórico"));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          teacher_id: MOCK_USER.id,
          activity_type: "exercicio",
          student_id: "student-001",
          class_id: "class-001",
        })
      );
    });
  });

  it("shows 'Salvo ✓' after successful save", async () => {
    const Wrapper = createTestWrapper();
    const { getByText } = render(
      <StepExport
        data={makeWizardData()}
        onPrev={vi.fn()}
        onRestart={vi.fn()}
      />,
      { wrapper: Wrapper }
    );

    fireEvent.click(getByText("Salvar no Histórico"));

    await waitFor(() => {
      expect(getByText("Salvo ✓")).toBeTruthy();
    });
  });

  it("returns null when result is null", () => {
    const Wrapper = createTestWrapper();
    const { container } = render(
      <StepExport
        data={makeWizardData({ result: null })}
        onPrev={vi.fn()}
        onRestart={vi.fn()}
      />,
      { wrapper: Wrapper }
    );

    expect(container.innerHTML).toBe("");
  });
});

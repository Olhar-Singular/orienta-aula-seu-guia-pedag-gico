import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MOCK_USER, MOCK_ADAPTATION_RESULT } from "../fixtures";
import { mockAuthHook, createTestWrapper } from "../helpers";
import type { EditableActivity } from "@/lib/pdf/editableActivity";

vi.mock("@/hooks/useAuth", () => mockAuthHook());
vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => ({ schoolId: "school-001" }),
}));

// Echo back exactly what the test asserts was sent — keeps the read-back
// verification happy regardless of the structured payload shape.
let lastUpdatePayload: any = null;
const mockUpdateSelect = vi.fn(() =>
  Promise.resolve({
    data: [{ id: "adapt-001", adaptation_result: lastUpdatePayload?.adaptation_result ?? {} }],
    error: null,
  }),
);
const mockUpdateEqTeacher = vi.fn(() => ({ select: mockUpdateSelect }));
const mockUpdateEq = vi.fn(() => ({ eq: mockUpdateEqTeacher }));
const mockUpdate = vi.fn((payload: any) => {
  lastUpdatePayload = payload;
  return { eq: mockUpdateEq };
});
const mockInsertSingle = vi.fn(() => Promise.resolve({ data: { id: "new-id" }, error: null }));
const mockInsert = vi.fn(() => ({ select: () => ({ single: mockInsertSingle }) }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "adaptations_history") {
        return { insert: mockInsert, update: mockUpdate };
      }
      return { insert: vi.fn(() => Promise.resolve({ error: null })) };
    }),
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: { access_token: "tok" } } }),
      ),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

vi.mock("@/lib/exportPdf", () => ({ exportToPdf: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/exportDocx", () => ({ exportToDocx: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/shareToken", () => ({ generateShareToken: () => "tok" }));

import StepExport from "@/components/adaptation/steps/export/StepExport";
import type { WizardData } from "@/components/adaptation/AdaptationWizard";

const makeData = (overrides: Partial<WizardData> = {}): WizardData => ({
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

describe("StepExport – edit mode (UPDATE)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Salvar alterações' label when editingId is provided", () => {
    const Wrapper = createTestWrapper();
    const { getByText, queryByText } = render(
      <StepExport
        data={makeData()}
        onPrev={vi.fn()}
        onRestart={vi.fn()}
        editingId="adapt-001"
      />,
      { wrapper: Wrapper },
    );
    expect(getByText("Salvar alterações")).toBeTruthy();
    expect(queryByText("Salvar no Histórico")).toBeNull();
  });

  it("calls supabase update().eq() instead of insert when editingId is set", async () => {
    const Wrapper = createTestWrapper();
    const { getByText } = render(
      <StepExport
        data={makeData()}
        onPrev={vi.fn()}
        onRestart={vi.fn()}
        editingId="adapt-001"
      />,
      { wrapper: Wrapper },
    );
    fireEvent.click(getByText("Salvar alterações"));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdateEq).toHaveBeenCalledWith("id", "adapt-001");
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  it("includes editable_activity_universal/directed in update payload", async () => {
    const layoutUniversal = { pages: [{ blocks: [{ id: "u" }] }] } as unknown as EditableActivity;
    const layoutDirected = { pages: [{ blocks: [{ id: "d" }] }] } as unknown as EditableActivity;
    const Wrapper = createTestWrapper();
    const { getByText } = render(
      <StepExport
        data={makeData({
          editableActivity: layoutUniversal,
          editableActivityDirected: layoutDirected,
        })}
        onPrev={vi.fn()}
        onRestart={vi.fn()}
        editingId="adapt-001"
      />,
      { wrapper: Wrapper },
    );
    fireEvent.click(getByText("Salvar alterações"));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          adaptation_result: expect.objectContaining({
            editable_activity_universal: layoutUniversal,
            editable_activity_directed: layoutDirected,
          }),
        }),
      );
    });
  });

  it("calls onSaved callback after successful update", async () => {
    const onSaved = vi.fn();
    const Wrapper = createTestWrapper();
    const { getByText } = render(
      <StepExport
        data={makeData()}
        onPrev={vi.fn()}
        onRestart={vi.fn()}
        editingId="adapt-001"
        onSaved={onSaved}
      />,
      { wrapper: Wrapper },
    );
    fireEvent.click(getByText("Salvar alterações"));
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
  });
});

describe("StepExport – insert mode (default)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("still uses insert when editingId is not provided", async () => {
    const Wrapper = createTestWrapper();
    const { getByText } = render(
      <StepExport data={makeData()} onPrev={vi.fn()} onRestart={vi.fn()} />,
      { wrapper: Wrapper },
    );
    fireEvent.click(getByText("Salvar no Histórico"));
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ teacher_id: MOCK_USER.id }),
      );
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  it("includes editable_activity_* in insert payload too (so re-edit hydrates layout)", async () => {
    const layout = { pages: [] } as unknown as EditableActivity;
    const Wrapper = createTestWrapper();
    const { getByText } = render(
      <StepExport
        data={makeData({ editableActivity: layout })}
        onPrev={vi.fn()}
        onRestart={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    fireEvent.click(getByText("Salvar no Histórico"));
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          adaptation_result: expect.objectContaining({
            editable_activity_universal: layout,
          }),
        }),
      );
    });
  });
});

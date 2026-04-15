import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { mockAuthHook, createSupabaseMock, createTestWrapper } from "../helpers";
import { MOCK_CLASS, MOCK_STUDENTS, MOCK_ADAPTATION_RESULT } from "../fixtures";
import { buildEditModeInitialData } from "@/lib/adaptationWizardHelpers";

vi.mock("@/integrations/supabase/client", () =>
  createSupabaseMock({
    classes: [MOCK_CLASS],
    class_students: MOCK_STUDENTS,
  }),
);
vi.mock("@/hooks/useAuth", () => mockAuthHook());
vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => ({ schoolId: "school-001" }),
}));

const { default: AdaptationWizard } = await import(
  "@/components/adaptation/AdaptationWizard"
);

const sampleRow = {
  id: "adapt-001",
  activity_type: "exercicio",
  original_activity: "Calcule 2+2",
  barriers_used: [
    { dimension: "tea", barrier_key: "tea_abstracao" },
  ],
  class_id: MOCK_CLASS.id,
  student_id: MOCK_STUDENTS[0].id,
  adaptation_result: MOCK_ADAPTATION_RESULT,
};

describe("AdaptationWizard – edit mode", () => {
  const wrapper = createTestWrapper("/dashboard/adaptacoes");

  it("opens directly on the AI editor step (Step 5) when editMode=true", () => {
    const initialData = buildEditModeInitialData(sampleRow as any);
    render(
      <AdaptationWizard
        editMode
        editingId="adapt-001"
        initialData={initialData}
        initialStepKey="ai_editor"
      />,
      { wrapper },
    );
    // Step 5 shows the editor heading. The same label appears in the mobile
    // step indicator, so allow multiple matches.
    expect(screen.getAllByText(/Editar Atividade Adaptada/i).length).toBeGreaterThan(0);
  });

  it("does not mount Step 1 content (StepActivityType) when in edit mode", () => {
    const initialData = buildEditModeInitialData(sampleRow as any);
    render(
      <AdaptationWizard
        editMode
        editingId="adapt-001"
        initialData={initialData}
        initialStepKey="ai_editor"
      />,
      { wrapper },
    );
    // StepActivityType heading. Not the stepper label "Tipo".
    expect(screen.queryByRole("heading", { name: /Tipo de Atividade/i })).toBeNull();
  });

  it("calls onClose when back is pressed at the editor step in edit mode", () => {
    const onClose = vi.fn();
    const initialData = buildEditModeInitialData(sampleRow as any);
    render(
      <AdaptationWizard
        editMode
        editingId="adapt-001"
        initialData={initialData}
        initialStepKey="ai_editor"
        onClose={onClose}
      />,
      { wrapper },
    );
    fireEvent.click(screen.getByLabelText("Voltar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clamps back navigation at Step 5 (back button stays on editor)", () => {
    const initialData = buildEditModeInitialData(sampleRow as any);
    render(
      <AdaptationWizard
        editMode
        editingId="adapt-001"
        initialData={initialData}
        initialStepKey="ai_editor"
      />,
      { wrapper },
    );
    const back = screen.getByLabelText("Voltar");
    fireEvent.click(back);
    // Still on the editor step — no Step Choice / Barriers rendered.
    expect(screen.queryByText(/Selecionar Modo/i)).toBeNull();
    expect(screen.getAllByText(/Editar Atividade Adaptada/i).length).toBeGreaterThan(0);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { createTestWrapper } from "../helpers";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

import StepBarrierSelection from "@/components/adaptation/steps/barriers/StepBarrierSelection";
import type { WizardData, BarrierItem } from "@/components/adaptation/AdaptationWizard";

function makeBarrierItems(): BarrierItem[] {
  return [
    { dimension: "tdah", barrier_key: "atencao_sustentada", label: "Dificuldade de atenção", is_active: true },
  ];
}

function makeWizardData(overrides: Partial<WizardData> = {}): WizardData {
  return {
    activityType: "prova",
    activityText: "",
    selectedQuestions: [],
    classId: "class-1",
    studentId: "student-1",
    studentName: "Aluno Teste",
    barriers: makeBarrierItems(),
    adaptForWholeClass: false,
    observationNotes: "",
    aiInstructions: "",
    result: null,
    contextPillars: null,
    questionImages: { version_universal: {}, version_directed: {} },
    ...overrides,
  } as WizardData;
}

function StatefulStep({ initial }: { initial: WizardData }) {
  const [data, setData] = useState<WizardData>(initial);
  return (
    <StepBarrierSelection
      data={data}
      updateData={(patch) => setData((prev) => ({ ...prev, ...patch }))}
      onNext={() => undefined}
      onPrev={() => undefined}
    />
  );
}

describe("StepBarrierSelection — campo aiInstructions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza o campo 'Instruções para a IA' depois de selecionar barreiras", async () => {
    render(<StatefulStep initial={makeWizardData()} />, { wrapper: createTestWrapper() });

    expect(await screen.findByText(/Instruções para a IA/i)).toBeDefined();
  });

  it("não renderiza o campo quando ainda não há barreiras carregadas", () => {
    render(
      <StatefulStep initial={makeWizardData({ barriers: [], studentId: null, classId: null })} />,
      { wrapper: createTestWrapper() }
    );

    expect(screen.queryByText(/Instruções para a IA/i)).toBeNull();
  });

});

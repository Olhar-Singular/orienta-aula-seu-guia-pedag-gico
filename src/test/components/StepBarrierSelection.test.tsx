import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function StatefulStep({ initial, onChange }: { initial: WizardData; onChange?: (p: Partial<WizardData>) => void }) {
  const [data, setData] = useState<WizardData>(initial);
  return (
    <StepBarrierSelection
      data={data}
      updateData={(patch) => {
        setData((prev) => ({ ...prev, ...patch }));
        onChange?.(patch);
      }}
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

  it("digitar no campo dispara updateData com aiInstructions", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulStep initial={makeWizardData()} onChange={onChange} />, {
      wrapper: createTestWrapper(),
    });

    const label = await screen.findByText(/Instruções para a IA/i);
    const card = label.closest("div");
    const textarea = card?.parentElement?.querySelector("textarea[placeholder*='emoji' i], textarea[placeholder*='tom' i], textarea[placeholder*='IA' i]") as HTMLTextAreaElement | null
      ?? screen.getAllByRole("textbox").find(
        (el) => el !== screen.getByDisplayValue("")
      ) as HTMLTextAreaElement;

    // Mais robusto: pega todas as textareas e usa a segunda (a primeira é observationNotes)
    const allTextareas = screen.getAllByRole("textbox");
    const aiTextarea = allTextareas[allTextareas.length - 1] as HTMLTextAreaElement;

    await user.type(aiTextarea, "use emojis");

    const lastCall = onChange.mock.calls
      .map((c) => c[0] as Partial<WizardData>)
      .filter((c) => "aiInstructions" in c)
      .pop();

    expect(lastCall).toBeDefined();
    expect(lastCall!.aiInstructions).toContain("use emojis");
  });

  it("respeita maxLength de 500 caracteres", async () => {
    render(<StatefulStep initial={makeWizardData()} />, { wrapper: createTestWrapper() });

    await screen.findByText(/Instruções para a IA/i);
    const allTextareas = screen.getAllByRole("textbox");
    const aiTextarea = allTextareas[allTextareas.length - 1] as HTMLTextAreaElement;

    expect(aiTextarea.maxLength).toBe(500);
  });

  it("exibe contador 0/500 inicialmente", async () => {
    render(<StatefulStep initial={makeWizardData()} />, { wrapper: createTestWrapper() });

    await screen.findByText(/Instruções para a IA/i);
    expect(screen.getByText("0/500")).toBeDefined();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MOCK_ADAPTATION_RESULT } from "../fixtures";
import { createTestWrapper } from "../helpers";

vi.mock("@/components/editor/ActivityEditor", () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="mock-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => ({ schoolId: "school-1" }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

import StepAIEditor from "@/components/adaptation/steps/ai-editor/StepAIEditor";
import type { WizardData } from "@/components/adaptation/AdaptationWizard";

function makeWizardData(overrides: Partial<WizardData> = {}): WizardData {
  return {
    activityType: "prova",
    activityText: "Atividade original",
    selectedQuestions: [],
    classId: null,
    studentId: null,
    studentName: null,
    barriers: [
      { dimension: "tdah", barrier_key: "atencao_sustentada", label: "Atenção", is_active: true },
    ],
    adaptForWholeClass: false,
    observationNotes: "",
    aiInstructions: "",
    result: MOCK_ADAPTATION_RESULT,
    contextPillars: null,
    questionImages: { version_universal: {}, version_directed: {} },
    ...overrides,
  } as WizardData;
}

describe("StepAIEditor — payload da edge function adapt-activity", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ adaptation: MOCK_ADAPTATION_RESULT }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  async function getAdaptActivityBody() {
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const adaptCall = fetchMock.mock.calls.find(([url]) =>
      typeof url === "string" && url.includes("/adapt-activity"),
    );
    expect(adaptCall, "expected fetch to /adapt-activity").toBeDefined();
    const [, init] = adaptCall!;
    return JSON.parse(init.body);
  }

  it("inclui ai_instructions no body quando o campo está preenchido", async () => {
    render(
      <StepAIEditor
        data={makeWizardData({
          aiInstructions: "use emojis e seja informal",
          result: null,
        })}
        updateData={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />,
      { wrapper: createTestWrapper() }
    );

    const body = await getAdaptActivityBody();
    expect(body.ai_instructions).toBe("use emojis e seja informal");
  });

  it("omite ai_instructions do body quando o campo está vazio", async () => {
    render(
      <StepAIEditor
        data={makeWizardData({ aiInstructions: "", result: null })}
        updateData={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />,
      { wrapper: createTestWrapper() }
    );

    const body = await getAdaptActivityBody();
    expect(body.ai_instructions).toBeUndefined();
  });

  it("omite ai_instructions quando o campo é só whitespace", async () => {
    render(
      <StepAIEditor
        data={makeWizardData({ aiInstructions: "   \n  ", result: null })}
        updateData={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />,
      { wrapper: createTestWrapper() }
    );

    const body = await getAdaptActivityBody();
    expect(body.ai_instructions).toBeUndefined();
  });
});

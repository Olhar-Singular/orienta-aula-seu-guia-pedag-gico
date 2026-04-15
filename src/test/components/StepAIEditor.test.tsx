import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MOCK_ADAPTATION_RESULT } from "../fixtures";
import { createTestWrapper } from "../helpers";

// Mock the ActivityEditor (renders a textarea + preview which need DOM APIs)
vi.mock("@/components/editor/ActivityEditor", () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="mock-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

// Mock useUserSchool
vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => ({ schoolId: "school-1" }),
}));

// Mock supabase client
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

// Mock use-toast
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

import StepAIEditor from "@/components/adaptation/steps/ai-editor/StepAIEditor";
import type { WizardData } from "@/components/adaptation/AdaptationWizard";

function makeWizardData(overrides: Partial<WizardData> = {}): WizardData {
  return {
    activityType: "prova",
    content: "test content",
    selectedBarriers: [],
    studentName: "Aluno Teste",
    mode: "ai",
    result: MOCK_ADAPTATION_RESULT,
    selectedQuestions: [],
    questionImages: { version_universal: {}, version_directed: {} },
    ...overrides,
  } as WizardData;
}

describe("StepAIEditor", () => {
  let onNext: ReturnType<typeof vi.fn>;
  let onPrev: ReturnType<typeof vi.fn>;
  let updateData: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onNext = vi.fn();
    onPrev = vi.fn();
    updateData = vi.fn();
  });

  it("renders version tabs and navigation buttons", () => {
    render(
      <StepAIEditor
        data={makeWizardData()}
        updateData={updateData}
        onNext={onNext}
        onPrev={onPrev}
      />,
      { wrapper: createTestWrapper() }
    );

    expect(screen.getByText("Versão Original")).toBeDefined();
    expect(screen.getByText("Versão Adaptada")).toBeDefined();
    expect(screen.getByRole("button", { name: /voltar/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /avançar/i })).toBeDefined();
  });

  it("initializes editor with DSL text from adaptation result", async () => {
    render(
      <StepAIEditor
        data={makeWizardData()}
        updateData={updateData}
        onNext={onNext}
        onPrev={onPrev}
      />,
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      const editor = screen.getByTestId("mock-editor") as HTMLTextAreaElement;
      // DSL text from MOCK_ADAPTATION_RESULT.version_universal should be loaded
      expect(editor.value).toContain("Quanto");
    });
  });

  it("calls onPrev when Voltar is clicked", async () => {
    const user = userEvent.setup();
    render(
      <StepAIEditor
        data={makeWizardData()}
        updateData={updateData}
        onNext={onNext}
        onPrev={onPrev}
      />,
      { wrapper: createTestWrapper() }
    );

    await user.click(screen.getByRole("button", { name: /voltar/i }));
    expect(onPrev).toHaveBeenCalled();
  });

  it("calls updateData and onNext when Avançar is clicked", async () => {
    const user = userEvent.setup();
    render(
      <StepAIEditor
        data={makeWizardData()}
        updateData={updateData}
        onNext={onNext}
        onPrev={onPrev}
      />,
      { wrapper: createTestWrapper() }
    );

    // Wait for editor initialization
    await waitFor(() => {
      const editor = screen.getByTestId("mock-editor") as HTMLTextAreaElement;
      expect(editor.value.length).toBeGreaterThan(0);
    });

    await user.click(screen.getByRole("button", { name: /avançar/i }));

    expect(updateData).toHaveBeenCalled();
    // Find the updateData call that writes back the edited result.
    const resultCall = updateData.mock.calls
      .map((c) => c[0])
      .find((c) => "result" in c);
    expect(resultCall).toBeDefined();
    expect(resultCall.result).toBeDefined();
    expect(onNext).toHaveBeenCalled();
  });

  it("switches between universal and directed tabs", async () => {
    const user = userEvent.setup();
    render(
      <StepAIEditor
        data={makeWizardData()}
        updateData={updateData}
        onNext={onNext}
        onPrev={onPrev}
      />,
      { wrapper: createTestWrapper() }
    );

    // Wait for initialization
    await waitFor(() => {
      const editor = screen.getByTestId("mock-editor") as HTMLTextAreaElement;
      expect(editor.value.length).toBeGreaterThan(0);
    });

    const universalText = (screen.getByTestId("mock-editor") as HTMLTextAreaElement).value;

    // Switch to directed
    await user.click(screen.getByText("Versão Adaptada"));

    await waitFor(() => {
      const editor = screen.getByTestId("mock-editor") as HTMLTextAreaElement;
      // Directed version should have different content
      expect(editor.value).not.toBe(universalText);
    });
  });
});

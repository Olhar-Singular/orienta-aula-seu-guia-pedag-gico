import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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

import StepAIEditor from "@/components/adaptation/StepAIEditor";
import type { WizardData } from "@/components/adaptation/AdaptationWizard";

function makeWizardData(overrides: Partial<WizardData> = {}): WizardData {
  return {
    activityType: "prova",
    activityText: "",
    selectedQuestions: [],
    classId: null,
    studentId: null,
    studentName: null,
    barriers: [],
    adaptForWholeClass: false,
    observationNotes: "",
    result: MOCK_ADAPTATION_RESULT,
    contextPillars: null,
    questionImages: { version_universal: {}, version_directed: {} },
    ...overrides,
  };
}

function latestUpdate(updateData: ReturnType<typeof vi.fn>, key: keyof WizardData) {
  const calls = updateData.mock.calls
    .map((c) => c[0] as Partial<WizardData>)
    .filter((c) => key in c);
  return calls[calls.length - 1]?.[key];
}

/** Wraps StepAIEditor with a real useState-backed data store so controlled
 *  inputs actually reflect onChange-driven state updates in tests. */
function StatefulStepAIEditor(props: {
  initialData: WizardData;
  onChange?: (patch: Partial<WizardData>) => void;
  onNext?: () => void;
  onPrev?: () => void;
}) {
  const [data, setData] = useState<WizardData>(props.initialData);
  return (
    <StepAIEditor
      data={data}
      updateData={(patch) => {
        setData((prev) => ({ ...prev, ...patch }));
        props.onChange?.(patch);
      }}
      onNext={props.onNext ?? (() => undefined)}
      onPrev={props.onPrev ?? (() => undefined)}
    />
  );
}

describe("StepAIEditor draft persistence (Bug 2)", () => {
  let onNext: ReturnType<typeof vi.fn>;
  let onPrev: ReturnType<typeof vi.fn>;
  let updateData: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onNext = vi.fn();
    onPrev = vi.fn();
    updateData = vi.fn();
  });

  it("restores draft from data.aiEditorUniversalDsl instead of re-converting result", async () => {
    render(
      <StepAIEditor
        data={makeWizardData({
          aiEditorUniversalDsl: "meu rascunho editado",
          aiEditorDirectedDsl: "rascunho direcionado diferente",
        })}
        updateData={updateData}
        onNext={onNext}
        onPrev={onPrev}
      />,
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      const editor = screen.getByTestId("mock-editor") as HTMLTextAreaElement;
      expect(editor.value).toBe("meu rascunho editado");
    });
  });

  it("switches to directed tab and shows its saved draft", async () => {
    const user = userEvent.setup();
    render(
      <StepAIEditor
        data={makeWizardData({
          aiEditorUniversalDsl: "rascunho universal",
          aiEditorDirectedDsl: "rascunho direcionado salvo",
        })}
        updateData={updateData}
        onNext={onNext}
        onPrev={onPrev}
      />,
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      const editor = screen.getByTestId("mock-editor") as HTMLTextAreaElement;
      expect(editor.value).toBe("rascunho universal");
    });

    await user.click(screen.getByText("Versão Direcionada"));

    await waitFor(() => {
      const editor = screen.getByTestId("mock-editor") as HTMLTextAreaElement;
      expect(editor.value).toBe("rascunho direcionado salvo");
    });
  });

  it("persists edits to aiEditorUniversalDsl via updateData on every change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StatefulStepAIEditor
        initialData={makeWizardData({
          aiEditorUniversalDsl: "start",
          aiEditorDirectedDsl: "outro",
        })}
        onChange={onChange}
      />,
      { wrapper: createTestWrapper() }
    );

    const editor = await screen.findByTestId("mock-editor") as HTMLTextAreaElement;
    await user.clear(editor);
    await user.type(editor, "abc");

    await waitFor(() => {
      expect(latestUpdate(onChange, "aiEditorUniversalDsl")).toBe("abc");
    });
  });

  it("persists edits to aiEditorDirectedDsl when on directed tab", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StatefulStepAIEditor
        initialData={makeWizardData({
          aiEditorUniversalDsl: "u",
          aiEditorDirectedDsl: "d",
        })}
        onChange={onChange}
      />,
      { wrapper: createTestWrapper() }
    );

    await user.click(screen.getByText("Versão Direcionada"));
    const editor = (await screen.findByTestId("mock-editor")) as HTMLTextAreaElement;
    await user.clear(editor);
    await user.type(editor, "xyz");

    await waitFor(() => {
      expect(latestUpdate(onChange, "aiEditorDirectedDsl")).toBe("xyz");
    });
  });

  it("seeds drafts from result when drafts are empty on first mount", async () => {
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
      const seeded = latestUpdate(updateData, "aiEditorUniversalDsl");
      expect(typeof seeded).toBe("string");
      expect((seeded as string).length).toBeGreaterThan(0);
    });
  });

  it("handleNext uses current draft value, not the initial result", async () => {
    const user = userEvent.setup();
    render(
      <StepAIEditor
        data={makeWizardData({
          aiEditorUniversalDsl: "1) rascunho customizado\n",
          aiEditorDirectedDsl: "1) direcionado customizado\n",
        })}
        updateData={updateData}
        onNext={onNext}
        onPrev={onPrev}
      />,
      { wrapper: createTestWrapper() }
    );

    await screen.findByTestId("mock-editor");
    await user.click(screen.getByRole("button", { name: /avançar/i }));

    const resultUpdate = updateData.mock.calls
      .map((c) => c[0] as Partial<WizardData>)
      .find((c) => "result" in c);
    expect(resultUpdate).toBeDefined();
    const updated = resultUpdate!.result!;
    const universal = updated.version_universal as { sections: Array<{ questions: Array<{ statement: string }> }> };
    const statements = universal.sections.flatMap((s) => s.questions.map((q) => q.statement));
    expect(statements.some((s) => s.includes("rascunho customizado"))).toBe(true);
  });
});

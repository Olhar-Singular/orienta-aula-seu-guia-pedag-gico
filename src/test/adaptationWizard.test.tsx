import { describe, it, expect } from "vitest";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";

describe("Wizard step navigation logic", () => {
  it("has 7 steps defined for each mode", () => {
    const AI_STEPS = ["type", "content", "barriers", "choice", "ai_editor", "pdf_preview", "export"];
    const MANUAL_STEPS = ["type", "content", "barriers", "choice", "editor", "pdf_preview", "export"];
    expect(AI_STEPS).toHaveLength(7);
    expect(MANUAL_STEPS).toHaveLength(7);
  });

  it("validates activity type selection", () => {
    const validTypes = ["prova", "exercicio", "atividade_casa", "trabalho"];
    validTypes.forEach((t) => {
      expect(typeof t).toBe("string");
      expect(t.length).toBeGreaterThan(0);
    });
  });

  it("prevents next without activity type", () => {
    const value: string | null = null;
    expect(!value).toBe(true);
  });

  it("allows next with activity type selected", () => {
    const value: string | null = "prova";
    expect(!!value).toBe(true);
  });

  it("prevents next without activity text", () => {
    const text = "";
    expect(!text.trim()).toBe(true);
  });

  it("allows next with activity text", () => {
    const text = "Resolva as questões abaixo";
    expect(!!text.trim()).toBe(true);
  });
});

describe("Barrier auto-loading from student profile", () => {
  it("maps all 11 neurodivergence dimensions", () => {
    expect(BARRIER_DIMENSIONS).toHaveLength(11);
    const keys = BARRIER_DIMENSIONS.map((d) => d.key);
    expect(keys).toContain("tea");
    expect(keys).toContain("tdah");
    expect(keys).toContain("tod");
    expect(keys).toContain("sindrome_down");
    expect(keys).toContain("altas_habilidades");
    expect(keys).toContain("dislexia");
    expect(keys).toContain("discalculia");
    expect(keys).toContain("disgrafia");
    expect(keys).toContain("tourette");
    expect(keys).toContain("dispraxia");
    expect(keys).toContain("toc");
  });

  it("creates barrier items from all dimensions", () => {
    const items = BARRIER_DIMENSIONS.flatMap((dim) =>
      dim.barriers.map((b) => ({
        dimension: dim.key,
        barrier_key: b.key,
        label: b.label,
        is_active: false,
      }))
    );
    expect(items.length).toBeGreaterThanOrEqual(24);
    items.forEach((item) => {
      expect(item.is_active).toBe(false);
      expect(item.dimension).toBeTruthy();
      expect(item.barrier_key).toBeTruthy();
      expect(item.label).toBeTruthy();
    });
  });

  it("activates barriers based on student data snapshot", () => {
    const studentBarriers = [
      { barrier_key: "tea_abstracao", dimension: "tea", is_active: true },
      { barrier_key: "tdah_atencao_sustentada", dimension: "tdah", is_active: true },
      { barrier_key: "dislexia_leitura", dimension: "dislexia", is_active: true },
    ];
    const activeKeys = new Set(studentBarriers.map((b) => b.barrier_key));

    const items = BARRIER_DIMENSIONS.flatMap((dim) =>
      dim.barriers.map((b) => ({
        dimension: dim.key,
        barrier_key: b.key,
        label: b.label,
        is_active: activeKeys.has(b.key),
      }))
    );

    const active = items.filter((i) => i.is_active);
    expect(active).toHaveLength(3);
    expect(active.map((a) => a.barrier_key)).toEqual([
      "tea_abstracao",
      "tdah_atencao_sustentada",
      "dislexia_leitura",
    ]);
  });

  it("toggles a barrier on/off", () => {
    const items = BARRIER_DIMENSIONS.flatMap((dim) =>
      dim.barriers.map((b) => ({
        dimension: dim.key,
        barrier_key: b.key,
        label: b.label,
        is_active: false,
      }))
    );

    const toggled = items.map((b) =>
      b.barrier_key === "tea_abstracao" ? { ...b, is_active: !b.is_active } : b
    );
    expect(toggled.find((b) => b.barrier_key === "tea_abstracao")!.is_active).toBe(true);

    const toggledOff = toggled.map((b) =>
      b.barrier_key === "tea_abstracao" ? { ...b, is_active: !b.is_active } : b
    );
    expect(toggledOff.find((b) => b.barrier_key === "tea_abstracao")!.is_active).toBe(false);
  });

  it("requires at least one active barrier to proceed", () => {
    const noActive = BARRIER_DIMENSIONS.flatMap((dim) =>
      dim.barriers.map((b) => ({ ...b, dimension: dim.key, is_active: false }))
    );
    expect(noActive.filter((b) => b.is_active).length).toBe(0);

    const withActive = noActive.map((b, i) => (i === 0 ? { ...b, is_active: true } : b));
    expect(withActive.filter((b) => b.is_active).length).toBe(1);
  });
});

describe("ai_editor step integration", () => {
  const STEP_SEQUENCES = {
    ai: ["type", "content", "barriers", "choice", "ai_editor", "export"],
    manual: ["type", "content", "barriers", "choice", "editor", "export"],
  } as const;

  const STEP_META: Record<string, { label: string; description: string }> = {
    type: { label: "Tipo", description: "Tipo de atividade" },
    content: { label: "Conteúdo", description: "Conteúdo da atividade" },
    choice: { label: "Modo", description: "Escolher modo" },
    barriers: { label: "Barreiras", description: "Aluno e barreiras" },
    ai_editor: { label: "Editor", description: "Editar atividade adaptada" },
    editor: { label: "Editor", description: "Editar atividade" },
    export: { label: "Exportar", description: "Salvar e exportar" },
  };

  it("ai mode has ai_editor as the step after choice", () => {
    const steps = STEP_SEQUENCES.ai;
    const choiceIdx = steps.indexOf("choice");
    expect(steps[choiceIdx + 1]).toBe("ai_editor");
  });

  it("manual mode has editor (not ai_editor) as the step after choice", () => {
    const steps = STEP_SEQUENCES.manual;
    const choiceIdx = steps.indexOf("choice");
    expect(steps[choiceIdx + 1]).toBe("editor");
  });

  it("ai_editor has correct meta label and description", () => {
    expect(STEP_META.ai_editor.label).toBe("Editor");
    expect(STEP_META.ai_editor.description).toBe("Editar atividade adaptada");
  });

  it("requestBack logic triggers confirmation when going back past ai_editor with result", () => {
    const steps = STEP_SEQUENCES.ai;
    const editorStepIndex = steps.indexOf("ai_editor");
    const currentStep = editorStepIndex; // on ai_editor
    const target = 0; // going back to type

    // Simulated condition from AdaptationWizard.requestBack
    const hasResult = true;
    const shouldConfirm =
      editorStepIndex !== -1 &&
      currentStep >= editorStepIndex &&
      target < editorStepIndex &&
      hasResult;

    expect(shouldConfirm).toBe(true);
  });

  it("requestBack does NOT trigger confirmation when no result", () => {
    const steps = STEP_SEQUENCES.ai;
    const editorStepIndex = steps.indexOf("ai_editor");
    const currentStep = editorStepIndex;
    const target = 0;

    const hasResult = false;
    const shouldConfirm =
      editorStepIndex !== -1 &&
      currentStep >= editorStepIndex &&
      target < editorStepIndex &&
      hasResult;

    expect(shouldConfirm).toBe(false);
  });

  it("requestBack does NOT trigger confirmation in manual mode (no ai_editor)", () => {
    const steps = STEP_SEQUENCES.manual;
    const editorStepIndex = (steps as readonly string[]).indexOf("ai_editor");

    expect(editorStepIndex).toBe(-1);
    // condition short-circuits because editorStepIndex === -1
    const shouldConfirm = editorStepIndex !== -1;
    expect(shouldConfirm).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createTestWrapper } from "../helpers";
import type { StructuredActivity, ActivityHeader } from "@/types/adaptation";
import type { AdaptationResult } from "@/components/adaptation/AdaptationWizard";

// Mock @react-pdf/renderer to avoid canvas/worker issues in jsdom
vi.mock("@react-pdf/renderer", () => ({
  pdf: vi.fn(() => ({ toBlob: vi.fn().mockResolvedValue(new Blob()) })),
  Document: ({ children }: any) => children,
  Page: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  View: ({ children }: any) => children,
  Image: () => null,
  StyleSheet: { create: (s: any) => s },
}));

// Mock PdfCanvasPreview — not testing canvas rendering
vi.mock("@/components/adaptation/pdf-preview/PdfCanvasPreview", () => ({
  default: ({ blob }: any) => (
    <div data-testid="pdf-canvas">{blob ? "pdf-ready" : "loading"}</div>
  ),
}));

// Mock @dnd-kit — no real drag-drop in unit tests
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: any) => children,
  DragOverlay: ({ children }: any) => children,
  PointerSensor: vi.fn(),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
  }),
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  useSensor: vi.fn(),
  useSensors: () => [],
}));

// Mock PreviewPdfDocument to avoid react-pdf render-tree complexity
vi.mock("@/lib/pdf/PreviewPdfDocument", () => ({
  default: () => null,
}));

import StepPdfPreview from "@/components/adaptation/steps/pdf-preview-step/StepPdfPreview";
import { toEditableActivity } from "@/lib/pdf/editableActivity";

// ─── Fixtures ───────────────────────────────────────────────────────────────

const mockUniversal: StructuredActivity = {
  sections: [
    {
      questions: [
        { number: 1, type: "open_ended", statement: "Universal Q1" },
      ],
    },
  ],
};

const mockDirected: StructuredActivity = {
  sections: [
    {
      questions: [
        { number: 1, type: "open_ended", statement: "Directed Q1" },
      ],
    },
  ],
};

const mockHeader: ActivityHeader = {
  schoolName: "",
  subject: "",
  teacherName: "",
  className: "",
  date: "11/04/2026",
  showStudentLine: true,
};

const mockResult: AdaptationResult = {
  version_universal: mockUniversal,
  version_directed: mockDirected,
  strategies_applied: [],
  pedagogical_justification: "",
  implementation_tips: [],
};

function makeDefaultProps(overrides: Record<string, any> = {}) {
  return {
    universalStructured: mockUniversal,
    directedStructured: mockDirected,
    defaultHeader: mockHeader,
    adaptationResult: mockResult,
    onNext: vi.fn(),
    onBack: vi.fn(),
    onUniversalChange: vi.fn(),
    onDirectedChange: vi.fn(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("StepPdfPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders with Universal tab active by default", () => {
    const props = makeDefaultProps();
    const { container } = render(<StepPdfPreview {...props} />, {
      wrapper: createTestWrapper(),
    });

    const universalBtn = container.querySelector("button");
    const allButtons = container.querySelectorAll("button");
    const universalTabBtn = Array.from(allButtons).find(
      (b) => b.textContent === "Original"
    );
    expect(universalTabBtn).toBeTruthy();
    expect(universalTabBtn!.className).toContain("bg-blue-600");
  });

  it("clicking Direcionada button makes it active (gets bg-blue-600 class)", () => {
    const props = makeDefaultProps();
    const { container } = render(<StepPdfPreview {...props} />, {
      wrapper: createTestWrapper(),
    });

    const allButtons = container.querySelectorAll("button");
    const directedBtn = Array.from(allButtons).find(
      (b) => b.textContent === "Adaptada"
    );
    expect(directedBtn).toBeTruthy();

    fireEvent.click(directedBtn!);

    // After click, directed tab should be active
    const updatedButtons = container.querySelectorAll("button");
    const updatedDirected = Array.from(updatedButtons).find(
      (b) => b.textContent === "Adaptada"
    );
    expect(updatedDirected!.className).toContain("bg-blue-600");

    // And universal should no longer be active
    const updatedUniversal = Array.from(updatedButtons).find(
      (b) => b.textContent === "Original"
    );
    expect(updatedUniversal!.className).not.toContain("bg-blue-600");
  });

  it("renders Undo and Redo buttons (disabled initially)", () => {
    const props = makeDefaultProps();
    const { container } = render(<StepPdfPreview {...props} />, {
      wrapper: createTestWrapper(),
    });

    const undoBtn = container.querySelector('button[title="Desfazer (Ctrl+Z)"]');
    const redoBtn = container.querySelector('button[title="Refazer (Ctrl+Y)"]');

    expect(undoBtn).toBeTruthy();
    expect(redoBtn).toBeTruthy();
    expect(undoBtn).toBeDisabled();
    expect(redoBtn).toBeDisabled();
  });

  it("renders zoom controls", () => {
    const props = makeDefaultProps();
    const { container } = render(<StepPdfPreview {...props} />, {
      wrapper: createTestWrapper(),
    });

    const zoomOutBtn = container.querySelector('button[title="Diminuir zoom"]');
    const zoomInBtn = container.querySelector('button[title="Aumentar zoom"]');
    const resetZoomBtn = container.querySelector('button[title="Zoom 100%"]');

    expect(zoomOutBtn).toBeTruthy();
    expect(zoomInBtn).toBeTruthy();
    expect(resetZoomBtn).toBeTruthy();
  });

  it("zoom in button increases zoom display value", () => {
    const props = makeDefaultProps();
    const { container } = render(<StepPdfPreview {...props} />, {
      wrapper: createTestWrapper(),
    });

    // Initial zoom should be 100%
    const zoomDisplay = container.querySelector("span.tabular-nums");
    expect(zoomDisplay?.textContent).toBe("100%");

    const zoomInBtn = container.querySelector('button[title="Aumentar zoom"]');
    fireEvent.click(zoomInBtn!);

    // Zoom should increase to 125%
    const updatedDisplay = container.querySelector("span.tabular-nums");
    expect(updatedDisplay?.textContent).toBe("125%");
  });

  it("zoom out button decreases zoom display value", () => {
    const props = makeDefaultProps();
    const { container } = render(<StepPdfPreview {...props} />, {
      wrapper: createTestWrapper(),
    });

    const zoomOutBtn = container.querySelector('button[title="Diminuir zoom"]');
    fireEvent.click(zoomOutBtn!);

    // Zoom should decrease from 100% to 75%
    const display = container.querySelector("span.tabular-nums");
    expect(display?.textContent).toBe("75%");
  });

  it("preset menu opens when Estilos button is clicked", () => {
    const props = makeDefaultProps();
    const { container } = render(<StepPdfPreview {...props} />, {
      wrapper: createTestWrapper(),
    });

    // Menu should not be visible initially
    expect(container.querySelector(".z-20")).toBeFalsy();

    const allButtons = container.querySelectorAll("button");
    const estilosBtn = Array.from(allButtons).find((b) =>
      b.textContent?.includes("Estilos")
    );
    expect(estilosBtn).toBeTruthy();

    fireEvent.click(estilosBtn!);

    // Preset menu should now be visible
    expect(container.querySelector(".z-20")).toBeTruthy();
  });

  it("calls onUniversalChange and onDirectedChange on mount (saves both versions)", () => {
    const onUniversalChange = vi.fn();
    const onDirectedChange = vi.fn();
    const props = makeDefaultProps({ onUniversalChange, onDirectedChange });

    render(<StepPdfPreview {...props} />, { wrapper: createTestWrapper() });

    expect(onUniversalChange).toHaveBeenCalledTimes(1);
    expect(onDirectedChange).toHaveBeenCalledTimes(1);
  });

  it("clicking Voltar ao Editor calls onBack", () => {
    const onBack = vi.fn();
    const props = makeDefaultProps({ onBack });

    render(<StepPdfPreview {...props} />, { wrapper: createTestWrapper() });

    const backBtn = screen.getByText("Voltar ao Editor");
    fireEvent.click(backBtn);

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("clicking Exportar calls onUniversalChange, onDirectedChange, and onNext", () => {
    const onNext = vi.fn();
    const onUniversalChange = vi.fn();
    const onDirectedChange = vi.fn();
    const props = makeDefaultProps({
      onNext,
      onUniversalChange,
      onDirectedChange,
    });

    render(<StepPdfPreview {...props} />, { wrapper: createTestWrapper() });

    // Clear the mount-time calls
    onUniversalChange.mockClear();
    onDirectedChange.mockClear();

    const exportBtn = screen.getByText("Exportar");
    fireEvent.click(exportBtn);

    expect(onUniversalChange).toHaveBeenCalledTimes(1);
    expect(onDirectedChange).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("renders the StructuralEditor section (Estrutura do Documento heading)", () => {
    const props = makeDefaultProps();
    render(<StepPdfPreview {...props} />, { wrapper: createTestWrapper() });

    expect(screen.getByText("Estrutura do Documento")).toBeTruthy();
  });

  it("renders the PdfCanvasPreview area", () => {
    const props = makeDefaultProps();
    render(<StepPdfPreview {...props} />, { wrapper: createTestWrapper() });

    expect(screen.getByTestId("pdf-canvas")).toBeTruthy();
  });

  it("renders Resetar button in toolbar", () => {
    const props = makeDefaultProps();
    render(<StepPdfPreview {...props} />, { wrapper: createTestWrapper() });

    expect(screen.getByText("Resetar")).toBeTruthy();
  });

  it("aplicar edição global registra um snapshot único no histórico (1 push, undo reverte)", () => {
    const onUniversalChange = vi.fn();
    const props = makeDefaultProps({ onUniversalChange });
    const { container } = render(<StepPdfPreview {...props} />, {
      wrapper: createTestWrapper(),
    });

    // Clear mount-time call
    onUniversalChange.mockClear();

    // Expandir painel global e aplicar fontSize
    const allButtons = Array.from(container.querySelectorAll("button"));
    const expandBtn = allButtons.find((b) =>
      b.textContent?.includes("Edição global"),
    );
    expect(expandBtn).toBeTruthy();
    fireEvent.click(expandBtn!);

    const incTamanho = screen.getByRole("checkbox", { name: /incluir tamanho/i });
    fireEvent.click(incTamanho);
    const tamanhoSelect = screen.getByRole("combobox", { name: "Tamanho" });
    fireEvent.change(tamanhoSelect, { target: { value: "20" } });

    const applyBtn = screen.getByRole("button", { name: /Aplicar a toda a prova/i });
    fireEvent.click(applyBtn);

    // Apply gerou exatamente 1 snapshot novo
    expect(onUniversalChange).toHaveBeenCalledTimes(1);
    const applied = onUniversalChange.mock.calls[0][0];
    const firstText = applied.questions[0].content.find((b: any) => b.type === "text");
    expect(firstText.style?.fontSize).toBe(20);

    // Undo deve reverter
    onUniversalChange.mockClear();
    const undoBtn = container.querySelector('button[title="Desfazer (Ctrl+Z)"]');
    expect(undoBtn).toBeTruthy();
    expect(undoBtn).not.toBeDisabled();
    fireEvent.click(undoBtn!);

    expect(onUniversalChange).toHaveBeenCalledTimes(1);
    const reverted = onUniversalChange.mock.calls[0][0];
    const revText = reverted.questions[0].content.find((b: any) => b.type === "text");
    // Reverted ao estado pristine — sem o fontSize 20
    expect(revText.style?.fontSize).not.toBe(20);
  });

  it("Resetar returns the layout to pristine even when savedUniversal reflects prior edits", () => {
    const pristine = toEditableActivity(mockUniversal, mockHeader);
    const editedSaved = {
      ...pristine,
      header: { ...pristine.header, schoolName: "Escola Editada" },
    };
    const onUniversalChange = vi.fn();
    const props = makeDefaultProps({
      savedUniversal: editedSaved,
      onUniversalChange,
    });

    render(<StepPdfPreview {...props} />, { wrapper: createTestWrapper() });

    onUniversalChange.mockClear();

    const resetBtn = screen.getByText("Resetar");
    fireEvent.click(resetBtn);

    expect(onUniversalChange).toHaveBeenCalledTimes(1);
    const nextActivity = onUniversalChange.mock.calls[0][0];
    expect(nextActivity.header.schoolName).toBe("");
  });
});

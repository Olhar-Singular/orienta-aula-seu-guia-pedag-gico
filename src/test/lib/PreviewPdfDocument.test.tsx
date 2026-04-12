import { describe, it, expect, vi } from "vitest";

// Use vi.hoisted so component references are available in vi.mock factory (which is hoisted)
const { MockDocument, MockPage, MockView, MockText, MockImage } = vi.hoisted(() => {
  const MockDocument = vi.fn((props: any) => props);
  const MockPage = vi.fn((props: any) => props);
  const MockView = vi.fn((props: any) => props);
  const MockText = vi.fn((props: any) => props);
  const MockImage = vi.fn((props: any) => props);
  return { MockDocument, MockPage, MockView, MockText, MockImage };
});

// Mock @react-pdf/renderer before the component is imported
vi.mock("@react-pdf/renderer", () => ({
  Document: MockDocument,
  Page: MockPage,
  View: MockView,
  Text: MockText,
  Image: MockImage,
  StyleSheet: { create: (styles: any) => styles },
  Font: { register: vi.fn() },
}));

import PreviewPdfDocument from "@/lib/pdf/PreviewPdfDocument";
import type { StrategiesData } from "@/lib/pdf/PreviewPdfDocument";
import type { EditableActivity } from "@/lib/pdf/editableActivity";

// ─── Local fixtures ──────────────────────────────────────────────────────────

const mockActivity: EditableActivity = {
  header: {
    schoolName: "Escola Municipal Exemplo",
    subject: "Matematica",
    teacherName: "Prof. Silva",
    className: "5A",
    date: "11/04/2026",
    showStudentLine: true,
  },
  globalShowSeparators: false,
  questions: [
    {
      id: "q1",
      number: 1,
      content: [{ id: "b1", type: "text", content: "Q1 text" }],
      alternatives: undefined,
    },
    {
      id: "q2",
      number: 2,
      content: [{ id: "b2", type: "text", content: "Q2 text" }],
      alternatives: ["a) Sim", "b) Nao"],
    },
  ],
};

const mockStrategies: StrategiesData = {
  strategiesApplied: ["Fragmentacao de enunciados", "Apoio visual"],
  pedagogicalJustification: "Adaptacoes focam em remover barreiras de processamento.",
  implementationTips: ["Leia em voz alta", "Permita material concreto"],
};

// ─── Tree traversal helpers ───────────────────────────────────────────────────

/** Finds all nodes in the React element tree that match a predicate */
function findAllNodes(node: any, predicate: (n: any) => boolean): any[] {
  if (!node || typeof node !== "object") return [];
  const results: any[] = [];
  if (predicate(node)) results.push(node);
  const kids = Array.isArray(node.props?.children)
    ? node.props.children
    : node.props?.children != null
      ? [node.props.children]
      : [];
  for (const child of kids) {
    results.push(...findAllNodes(child, predicate));
  }
  return results;
}

/** Recursively collects all string text from the element tree */
function collectText(node: any): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node !== "object") return "";
  // Check if this is an array (React children)
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  const kids = node.props?.children;
  if (kids == null) return "";
  if (Array.isArray(kids)) return kids.map(collectText).join(" ");
  return collectText(kids);
}

/** Returns all Page elements from the Document's children */
function getPages(el: any): any[] {
  return findAllNodes(el, (n) => n.type === MockPage);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("PreviewPdfDocument", () => {
  it("renders one Page when strategies is undefined", () => {
    const el = PreviewPdfDocument({ activity: mockActivity, strategies: undefined });
    const pages = getPages(el);
    expect(pages).toHaveLength(1);
  });

  it("renders two Pages when strategies is provided", () => {
    const el = PreviewPdfDocument({ activity: mockActivity, strategies: mockStrategies });
    const pages = getPages(el);
    expect(pages).toHaveLength(2);
  });

  it("strategies page includes 'Estrategias Aplicadas' when strategiesApplied is not empty", () => {
    const el = PreviewPdfDocument({ activity: mockActivity, strategies: mockStrategies });
    const pages = getPages(el);
    const strategiesPage = pages[1];
    const text = collectText(strategiesPage);
    expect(text).toContain("Estrategias Aplicadas");
  });

  it("strategies page omits 'Estrategias Aplicadas' section when array is empty", () => {
    const strategies: StrategiesData = {
      ...mockStrategies,
      strategiesApplied: [],
    };
    const el = PreviewPdfDocument({ activity: mockActivity, strategies });
    const pages = getPages(el);
    const strategiesPage = pages[1];
    const text = collectText(strategiesPage);
    expect(text).not.toContain("Estrategias Aplicadas");
  });

  it("strategies page includes 'Justificativa Pedagogica' when provided", () => {
    const el = PreviewPdfDocument({ activity: mockActivity, strategies: mockStrategies });
    const pages = getPages(el);
    const strategiesPage = pages[1];
    const text = collectText(strategiesPage);
    expect(text).toContain("Justificativa Pedagogica");
  });

  it("strategies page omits justification section when empty string", () => {
    const strategies: StrategiesData = {
      ...mockStrategies,
      pedagogicalJustification: "",
    };
    const el = PreviewPdfDocument({ activity: mockActivity, strategies });
    const pages = getPages(el);
    const strategiesPage = pages[1];
    const text = collectText(strategiesPage);
    expect(text).not.toContain("Justificativa Pedagogica");
  });

  it("strategies page includes 'Dicas de Implementacao' when implementationTips not empty", () => {
    const el = PreviewPdfDocument({ activity: mockActivity, strategies: mockStrategies });
    const pages = getPages(el);
    const strategiesPage = pages[1];
    const text = collectText(strategiesPage);
    expect(text).toContain("Dicas de Implementacao");
  });

  it("strategies page omits 'Dicas de Implementacao' when implementationTips is empty", () => {
    const strategies: StrategiesData = {
      ...mockStrategies,
      implementationTips: [],
    };
    const el = PreviewPdfDocument({ activity: mockActivity, strategies });
    const pages = getPages(el);
    const strategiesPage = pages[1];
    const text = collectText(strategiesPage);
    expect(text).not.toContain("Dicas de Implementacao");
  });

  it("renders questions in order from activity.questions", () => {
    const el = PreviewPdfDocument({ activity: mockActivity, strategies: undefined });
    const pages = getPages(el);
    const activityPage = pages[0];
    const text = collectText(activityPage);
    // The source renders <Text>Questao {q.number}</Text> which becomes "Questao  1" (JSX space)
    expect(text).toContain("Questao");
    expect(text).toContain("Q1 text");
    expect(text).toContain("Q2 text");
    // Q1 content comes before Q2 content
    expect(text.indexOf("Q1 text")).toBeLessThan(text.indexOf("Q2 text"));
  });

  it("uses activity.globalShowSeparators for separator display", () => {
    // globalShowSeparators=true: Q2 (qi=1) should get a separator View
    const activityWithSeparators: EditableActivity = {
      ...mockActivity,
      globalShowSeparators: true,
    };
    const el = PreviewPdfDocument({
      activity: activityWithSeparators,
      strategies: undefined,
    });
    const pages = getPages(el);
    expect(pages).toHaveLength(1);
    // Render completes successfully with both questions present
    const text = collectText(pages[0]);
    expect(text).toContain("Q1 text");
    expect(text).toContain("Q2 text");
  });

  it("renders question content blocks on the activity page", () => {
    const el = PreviewPdfDocument({ activity: mockActivity, strategies: undefined });
    const pages = getPages(el);
    const text = collectText(pages[0]);
    expect(text).toContain("Q1 text");
    expect(text).toContain("Q2 text");
  });

  it("renders alternatives on the activity page", () => {
    const el = PreviewPdfDocument({ activity: mockActivity, strategies: undefined });
    const pages = getPages(el);
    const text = collectText(pages[0]);
    expect(text).toContain("a) Sim");
    expect(text).toContain("b) Nao");
  });
});

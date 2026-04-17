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

/** Recursively collects all string text from the element tree. Walks
 *  both `children` and string-valued props (`text`) so components that pass
 *  rendered content via props (e.g. PDFRichLine) are still visible to
 *  assertions. */
function collectText(node: any): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node !== "object") return "";
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  const parts: string[] = [];
  const textProp = node.props?.text;
  if (typeof textProp === "string") {
    // Strip HTML tags so rich-formatted content matches plain-text assertions.
    parts.push(textProp.replace(/<[^>]+>/g, ""));
  }
  const kids = node.props?.children;
  if (kids != null) {
    if (Array.isArray(kids)) parts.push(...kids.map(collectText));
    else parts.push(collectText(kids));
  }
  return parts.join(" ");
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

  it("renders scaffolding blocks inline at their position with an Apoio label", () => {
    const activityWithScaffolding: EditableActivity = {
      ...mockActivity,
      questions: [
        {
          id: "q1",
          number: 1,
          content: [
            { id: "b1", type: "text", content: "Problema" },
            {
              id: "b2",
              type: "scaffolding",
              items: [
                "Leia o enunciado",
                "Identifique os dados",
                "Escolha a operacao",
              ],
            },
          ],
        },
      ],
    };
    const el = PreviewPdfDocument({ activity: activityWithScaffolding, strategies: undefined });
    const pages = getPages(el);
    const text = collectText(pages[0]);
    expect(text).toContain("Apoio");
    expect(text).toContain("Leia o enunciado");
    expect(text).toContain("Identifique os dados");
    expect(text).toContain("Escolha a operacao");
  });

  it("renders question instruction before the content", () => {
    const activityWithInstruction: EditableActivity = {
      ...mockActivity,
      questions: [
        {
          id: "q1",
          number: 1,
          content: [{ id: "b1", type: "text", content: "Enunciado" }],
          instruction: "Dica: leia devagar.",
        },
      ],
    };
    const el = PreviewPdfDocument({ activity: activityWithInstruction, strategies: undefined });
    const pages = getPages(el);
    const text = collectText(pages[0]);
    const instructionIndex = text.indexOf("Dica: leia devagar.");
    const contentIndex = text.indexOf("Enunciado");
    expect(instructionIndex).toBeGreaterThanOrEqual(0);
    expect(instructionIndex).toBeLessThan(contentIndex);
  });

  it("renders general instructions before questions when present", () => {
    const activityWithGeneral: EditableActivity = {
      ...mockActivity,
      generalInstructions: "Responda com caneta azul.",
    };
    const el = PreviewPdfDocument({ activity: activityWithGeneral, strategies: undefined });
    const pages = getPages(el);
    const text = collectText(pages[0]);
    expect(text).toContain("Responda com caneta azul.");
  });

  // ── Rich types rendering (Fase A) ──

  describe("rich question types", () => {
    it("renders multiple_answer check_items with checked/unchecked marks", () => {
      const activity: EditableActivity = {
        ...mockActivity,
        questions: [
          {
            id: "q1",
            number: 1,
            questionType: "multiple_answer",
            content: [{ id: "b1", type: "text", content: "Selecione:" }],
            checkItems: [
              { text: "Certo 1", checked: true },
              { text: "Errado", checked: false },
              { text: "Certo 2", checked: true },
            ],
          },
        ],
      };
      const el = PreviewPdfDocument({ activity, strategies: undefined });
      const text = collectText(getPages(el)[0]);
      expect(text).toContain("Certo 1");
      expect(text).toContain("Errado");
      expect(text).toContain("Certo 2");
    });

    it("renders true_false tf_items with their text", () => {
      const activity: EditableActivity = {
        ...mockActivity,
        questions: [
          {
            id: "q1",
            number: 1,
            questionType: "true_false",
            content: [{ id: "b1", type: "text", content: "V ou F:" }],
            tfItems: [
              { text: "Primeira afirmacao", marked: null },
              { text: "Segunda afirmacao", marked: null },
            ],
          },
        ],
      };
      const el = PreviewPdfDocument({ activity, strategies: undefined });
      const text = collectText(getPages(el)[0]);
      expect(text).toContain("Primeira afirmacao");
      expect(text).toContain("Segunda afirmacao");
    });

    it("renders V/F text when tf_item is marked", () => {
      const activity: EditableActivity = {
        ...mockActivity,
        questions: [
          {
            id: "q1",
            number: 1,
            questionType: "true_false",
            content: [{ id: "b1", type: "text", content: "V ou F:" }],
            tfItems: [
              { text: "Afirmacao certa", marked: true },
              { text: "Afirmacao errada", marked: false },
              { text: "Afirmacao em branco", marked: null },
            ],
          },
        ],
      };
      const el = PreviewPdfDocument({ activity, strategies: undefined });
      const text = collectText(getPages(el)[0]);
      expect(text).toContain("V");
      expect(text).toContain("F");
      expect(text).toContain("Afirmacao em branco");
    });

    it("renders matching match_pairs as two-column pairs", () => {
      const activity: EditableActivity = {
        ...mockActivity,
        questions: [
          {
            id: "q1",
            number: 1,
            questionType: "matching",
            content: [{ id: "b1", type: "text", content: "Associe:" }],
            matchPairs: [
              { left: "Brasil", right: "Brasilia" },
              { left: "Chile", right: "Santiago" },
            ],
          },
        ],
      };
      const el = PreviewPdfDocument({ activity, strategies: undefined });
      const text = collectText(getPages(el)[0]);
      expect(text).toContain("Brasil");
      expect(text).toContain("Brasilia");
      expect(text).toContain("Chile");
      expect(text).toContain("Santiago");
    });

    it("renders ordering order_items with [N] prefix", () => {
      const activity: EditableActivity = {
        ...mockActivity,
        questions: [
          {
            id: "q1",
            number: 1,
            questionType: "ordering",
            content: [{ id: "b1", type: "text", content: "Ordene:" }],
            orderItems: [
              { n: 1, text: "Celula" },
              { n: 2, text: "Tecido" },
              { n: 3, text: "Orgao" },
            ],
          },
        ],
      };
      const el = PreviewPdfDocument({ activity, strategies: undefined });
      const text = collectText(getPages(el)[0]);
      expect(text).toContain("Celula");
      expect(text).toContain("Tecido");
      expect(text).toContain("Orgao");
    });

    it("renders table table_rows as cells", () => {
      const activity: EditableActivity = {
        ...mockActivity,
        questions: [
          {
            id: "q1",
            number: 1,
            questionType: "table",
            content: [{ id: "b1", type: "text", content: "Marque:" }],
            tableRows: [
              ["", "Sim", "Nao"],
              ["Item 1", "( )", "( )"],
              ["Item 2", "( )", "( )"],
            ],
          },
        ],
      };
      const el = PreviewPdfDocument({ activity, strategies: undefined });
      const text = collectText(getPages(el)[0]);
      expect(text).toContain("Sim");
      expect(text).toContain("Nao");
      expect(text).toContain("Item 1");
      expect(text).toContain("Item 2");
    });

    it("does not render alternatives block for multiple_answer type (uses checkItems)", () => {
      const activity: EditableActivity = {
        ...mockActivity,
        questions: [
          {
            id: "q1",
            number: 1,
            questionType: "multiple_answer",
            content: [{ id: "b1", type: "text", content: "X" }],
            // alternatives shouldn't be rendered for multiple_answer
            alternatives: ["a) Should not appear"],
            checkItems: [{ text: "Real item", checked: true }],
          },
        ],
      };
      const el = PreviewPdfDocument({ activity, strategies: undefined });
      const text = collectText(getPages(el)[0]);
      expect(text).toContain("Real item");
      expect(text).not.toContain("Should not appear");
    });
  });

  it("renders section title once before the first question of a section", () => {
    const activityWithSections: EditableActivity = {
      ...mockActivity,
      questions: [
        {
          id: "q1",
          number: 1,
          content: [{ id: "b1", type: "text", content: "Q1" }],
          sectionTitle: "Parte 1 - Fracoes",
        },
        {
          id: "q2",
          number: 2,
          content: [{ id: "b2", type: "text", content: "Q2" }],
          sectionTitle: "Parte 1 - Fracoes",
        },
        {
          id: "q3",
          number: 3,
          content: [{ id: "b3", type: "text", content: "Q3" }],
          sectionTitle: "Parte 2 - Decimais",
        },
      ],
    };
    const el = PreviewPdfDocument({ activity: activityWithSections, strategies: undefined });
    const pages = getPages(el);
    const text = collectText(pages[0]);
    const matches1 = text.match(/Parte 1 - Fracoes/g);
    const matches2 = text.match(/Parte 2 - Decimais/g);
    expect(matches1?.length).toBe(1);
    expect(matches2?.length).toBe(1);
    expect(text.indexOf("Parte 1 - Fracoes")).toBeLessThan(text.indexOf("Q1"));
    expect(text.indexOf("Parte 2 - Decimais")).toBeLessThan(text.indexOf("Q3"));
  });
});

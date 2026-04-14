import { describe, it, expect, vi } from "vitest";
import { resolveFontFamily, textStyleToPdf } from "@/lib/pdf/contentRenderer";
import type { TextStyle } from "@/types/adaptation";

// Use vi.hoisted so the variables are available inside the vi.mock factory (which is hoisted)
const { MockView, MockText, MockImage } = vi.hoisted(() => {
  const MockView = vi.fn((props: any) => props);
  const MockText = vi.fn((props: any) => props);
  const MockImage = vi.fn((props: any) => props);
  return { MockView, MockText, MockImage };
});

// Mock @react-pdf/renderer — vi.mock is hoisted but the MockX vars are also hoisted via vi.hoisted
vi.mock("@react-pdf/renderer", () => ({
  View: MockView,
  Text: MockText,
  Image: MockImage,
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Font: { register: vi.fn() },
}));

// Import after mock is set up
import {
  renderContentBlock,
  renderActivityHeader,
  renderAnswerLines,
} from "@/lib/pdf/contentRenderer";
import type { ContentBlock, ActivityHeader } from "@/types/adaptation";

const CONTENT_WIDTH = 483;

// ─── resolveFontFamily ───────────────────────────────────────────────────────

describe("resolveFontFamily", () => {
  it("returns base font when no bold/italic", () => {
    expect(resolveFontFamily("Helvetica", false, false)).toBe("Helvetica");
    expect(resolveFontFamily("Courier", false, false)).toBe("Courier");
    expect(resolveFontFamily("Times-Roman", false, false)).toBe("Times-Roman");
  });

  it("returns bold variant for Helvetica and Courier", () => {
    expect(resolveFontFamily("Helvetica", true, false)).toBe("Helvetica-Bold");
    expect(resolveFontFamily("Courier", true, false)).toBe("Courier-Bold");
  });

  it("returns italic/oblique variant", () => {
    expect(resolveFontFamily("Helvetica", false, true)).toBe("Helvetica-Oblique");
    expect(resolveFontFamily("Courier", false, true)).toBe("Courier-Oblique");
    expect(resolveFontFamily("Times-Roman", false, true)).toBe("Times-Italic");
  });

  it("returns bold+italic variant", () => {
    expect(resolveFontFamily("Helvetica", true, true)).toBe("Helvetica-BoldOblique");
    expect(resolveFontFamily("Courier", true, true)).toBe("Courier-BoldOblique");
    expect(resolveFontFamily("Times-Roman", true, true)).toBe("Times-BoldItalic");
  });
});

// ─── textStyleToPdf ──────────────────────────────────────────────────────────

describe("textStyleToPdf", () => {
  it("uses defaults when no style provided", () => {
    const result = textStyleToPdf();

    expect(result).toEqual({
      fontSize: 11,
      fontFamily: "Helvetica",
      textAlign: "justify",
      lineHeight: 1.5,
    });
  });

  it("merges partial style with defaults", () => {
    const style: TextStyle = { fontSize: 14, bold: true };
    const result = textStyleToPdf(style);

    expect(result).toEqual({
      fontSize: 14,
      fontFamily: "Helvetica-Bold",
      textAlign: "justify",
      lineHeight: 1.5,
    });
  });

  it("resolves font family with bold+italic", () => {
    const style: TextStyle = {
      fontFamily: "Times-Roman",
      bold: true,
      italic: true,
    };
    const result = textStyleToPdf(style);

    expect(result.fontFamily).toBe("Times-BoldItalic");
  });

  it("applies all custom values", () => {
    const style: TextStyle = {
      fontSize: 16,
      fontFamily: "Courier",
      bold: false,
      italic: true,
      textAlign: "center",
      lineHeight: 2,
    };
    const result = textStyleToPdf(style);

    expect(result).toEqual({
      fontSize: 16,
      fontFamily: "Courier-Oblique",
      textAlign: "center",
      lineHeight: 2,
    });
  });
});

// ─── renderContentBlock ──────────────────────────────────────────────────────

describe("renderContentBlock", () => {
  // text blocks
  it("text block with undefined style renders Text with default style merged", () => {
    const block: ContentBlock = { id: "b1", type: "text", content: "Hello" };
    const el = renderContentBlock(block) as any;

    expect(el).not.toBeNull();
    expect(el.type).toBe(MockText);
    expect(el.props.children).toBe("Hello");
    expect(el.props.style).toMatchObject({
      fontSize: 11,
      fontFamily: "Helvetica",
      textAlign: "justify",
      lineHeight: 1.5,
    });
  });

  it("text block with fontSize:14 override renders Text with fontSize:14 and other defaults", () => {
    const block: ContentBlock = {
      id: "b2",
      type: "text",
      content: "Texto grande",
      style: { fontSize: 14 },
    };
    const el = renderContentBlock(block) as any;

    expect(el.type).toBe(MockText);
    expect(el.props.style).toMatchObject({ fontSize: 14 });
    expect(el.props.style).toMatchObject({ lineHeight: 1.5, textAlign: "justify" });
  });

  it("text block with bold+italic renders resolved font variant", () => {
    const block: ContentBlock = {
      id: "b3",
      type: "text",
      content: "Bold italic",
      style: { bold: true, italic: true, fontFamily: "Helvetica" },
    };
    const el = renderContentBlock(block) as any;

    expect(el.type).toBe(MockText);
    expect(el.props.style).toMatchObject({ fontFamily: "Helvetica-BoldOblique" });
  });

  // richContent — inline colored runs
  it("text block with richContent renders nested Text runs with colors", () => {
    const block: ContentBlock = {
      id: "b4",
      type: "text",
      content: "Leia com atencao",
      richContent: [
        { text: "Leia com " },
        { text: "atencao", color: "#dc2626" },
      ],
    };
    const el = renderContentBlock(block) as any;

    expect(el.type).toBe(MockText);
    const children = Array.isArray(el.props.children)
      ? el.props.children
      : [el.props.children];
    const runs = children.filter((c: any) => c && c.type === MockText);
    expect(runs).toHaveLength(2);
    expect(runs[0].props.children).toBe("Leia com ");
    expect(runs[0].props.style?.color).toBeUndefined();
    expect(runs[1].props.children).toBe("atencao");
    expect(runs[1].props.style).toMatchObject({ color: "#dc2626" });
  });

  it("text block with empty richContent falls back to plain content", () => {
    const block: ContentBlock = {
      id: "b5",
      type: "text",
      content: "Fallback",
      richContent: [],
    };
    const el = renderContentBlock(block) as any;

    expect(el.type).toBe(MockText);
    expect(el.props.children).toBe("Fallback");
  });

  it("text block with richContent preserves block-level style on parent", () => {
    const block: ContentBlock = {
      id: "b6",
      type: "text",
      content: "Colorido grande",
      style: { fontSize: 16, bold: true },
      richContent: [
        { text: "Colorido ", color: "#2563eb" },
        { text: "grande" },
      ],
    };
    const el = renderContentBlock(block) as any;

    expect(el.props.style).toMatchObject({ fontSize: 16, fontFamily: "Helvetica-Bold" });
  });

  // bold/italic inline runs
  it("run with bold:true gets Helvetica-Bold fontFamily override", () => {
    const block: ContentBlock = {
      id: "b7",
      type: "text",
      content: "Selecione **todas** as corretas:",
      richContent: [
        { text: "Selecione " },
        { text: "todas", bold: true },
        { text: " as corretas:" },
      ],
    };
    const el = renderContentBlock(block) as any;
    const children = Array.isArray(el.props.children) ? el.props.children : [el.props.children];
    const runs = children.filter((c: any) => c && c.type === MockText);
    // The bold run should have Helvetica-Bold
    const boldRun = runs.find((r: any) => r.props.children === "todas");
    expect(boldRun).toBeDefined();
    expect(boldRun.props.style).toMatchObject({ fontFamily: "Helvetica-Bold" });
    // The plain run should not have fontFamily override
    const plainRun = runs.find((r: any) => r.props.children === "Selecione ");
    expect(plainRun.props.style).toBeUndefined();
  });

  it("run with italic:true gets Helvetica-Oblique fontFamily override", () => {
    const block: ContentBlock = {
      id: "b8",
      type: "text",
      content: "Leia *com atenção*:",
      richContent: [
        { text: "Leia " },
        { text: "com atenção", italic: true },
        { text: ":" },
      ],
    };
    const el = renderContentBlock(block) as any;
    const children = Array.isArray(el.props.children) ? el.props.children : [el.props.children];
    const runs = children.filter((c: any) => c && c.type === MockText);
    const italicRun = runs.find((r: any) => r.props.children === "com atenção");
    expect(italicRun).toBeDefined();
    expect(italicRun.props.style).toMatchObject({ fontFamily: "Helvetica-Oblique" });
  });

  it("run with both bold and italic gets Helvetica-BoldOblique", () => {
    const block: ContentBlock = {
      id: "b9",
      type: "text",
      content: "texto ***importante***",
      richContent: [
        { text: "texto " },
        { text: "importante", bold: true, italic: true },
      ],
    };
    const el = renderContentBlock(block) as any;
    const children = Array.isArray(el.props.children) ? el.props.children : [el.props.children];
    const runs = children.filter((c: any) => c && c.type === MockText);
    const biRun = runs.find((r: any) => r.props.children === "importante");
    expect(biRun).toBeDefined();
    expect(biRun.props.style).toMatchObject({ fontFamily: "Helvetica-BoldOblique" });
  });

  // image blocks — alignment
  it("image block with alignment 'center' wraps with center style", () => {
    const block: ContentBlock = {
      id: "img1",
      type: "image",
      src: "https://example.com/img.png",
      width: 0.5,
      alignment: "center",
    };
    const el = renderContentBlock(block) as any;

    expect(el).not.toBeNull();
    expect(el.type).toBe(MockView);
    const wrapperStyle = Array.isArray(el.props.style)
      ? Object.assign({}, ...el.props.style)
      : el.props.style;
    expect(wrapperStyle).toMatchObject({ alignItems: "center" });
  });

  it("image block with alignment 'left' wraps with flex-start style", () => {
    const block: ContentBlock = {
      id: "img2",
      type: "image",
      src: "https://example.com/img.png",
      width: 0.5,
      alignment: "left",
    };
    const el = renderContentBlock(block) as any;

    const wrapperStyle = Array.isArray(el.props.style)
      ? Object.assign({}, ...el.props.style)
      : el.props.style;
    expect(wrapperStyle).toMatchObject({ alignItems: "flex-start" });
  });

  it("image block with alignment 'right' wraps with flex-end style", () => {
    const block: ContentBlock = {
      id: "img3",
      type: "image",
      src: "https://example.com/img.png",
      width: 0.5,
      alignment: "right",
    };
    const el = renderContentBlock(block) as any;

    const wrapperStyle = Array.isArray(el.props.style)
      ? Object.assign({}, ...el.props.style)
      : el.props.style;
    expect(wrapperStyle).toMatchObject({ alignItems: "flex-end" });
  });

  it("image block with caption renders Text with caption content", () => {
    const block: ContentBlock = {
      id: "img4",
      type: "image",
      src: "https://example.com/img.png",
      width: 0.5,
      alignment: "center",
      caption: "Figura 1: Diagrama",
    };
    const el = renderContentBlock(block) as any;

    const children = Array.isArray(el.props.children)
      ? el.props.children
      : [el.props.children];
    const captionEl = children.find(
      (c: any) => c && c.type === MockText,
    );
    expect(captionEl).toBeDefined();
    expect(captionEl.props.children).toBe("Figura 1: Diagrama");
  });

  it("image block without caption does not render a caption Text", () => {
    const block: ContentBlock = {
      id: "img5",
      type: "image",
      src: "https://example.com/img.png",
      width: 0.5,
      alignment: "center",
    };
    const el = renderContentBlock(block) as any;

    const children = Array.isArray(el.props.children)
      ? el.props.children
      : [el.props.children];
    const captionEl = children.find(
      (c: any) => c && c.type === MockText,
    );
    expect(captionEl ?? null).toBeNull();
  });

  it("image block respects width (0.5 → 50% of CONTENT_WIDTH)", () => {
    const block: ContentBlock = {
      id: "img6",
      type: "image",
      src: "https://example.com/img.png",
      width: 0.5,
      alignment: "center",
    };
    const el = renderContentBlock(block) as any;

    const children = Array.isArray(el.props.children)
      ? el.props.children
      : [el.props.children];
    const imgEl = children.find((c: any) => c && c.type === MockImage);
    expect(imgEl).toBeDefined();
    expect(imgEl.props.style).toMatchObject({ width: CONTENT_WIDTH * 0.5 });
  });

  // page_break
  it("page_break block returns View with break prop", () => {
    const block: ContentBlock = { id: "pb1", type: "page_break" };
    const el = renderContentBlock(block) as any;

    expect(el).not.toBeNull();
    expect(el.type).toBe(MockView);
    expect(el.props.break).toBe(true);
  });

  // unknown type
  it("unknown block type returns null", () => {
    const block = { id: "unk1", type: "unknown" } as unknown as ContentBlock;
    const el = renderContentBlock(block);

    expect(el).toBeNull();
  });
});

// ─── renderActivityHeader ────────────────────────────────────────────────────

describe("renderActivityHeader", () => {
  const BASE_HEADER: ActivityHeader = {
    schoolName: "Escola Municipal Exemplo",
    subject: "Matematica",
    teacherName: "Prof. Silva",
    className: "5A",
    date: "11/04/2026",
    showStudentLine: true,
  };

  /** Recursively searches the element tree for a node matching predicate */
  function findNode(node: any, predicate: (n: any) => boolean): any {
    if (!node || typeof node !== "object") return null;
    if (predicate(node)) return node;
    const kids = Array.isArray(node.props?.children)
      ? node.props.children
      : node.props?.children != null
        ? [node.props.children]
        : [];
    for (const child of kids) {
      const found = findNode(child, predicate);
      if (found) return found;
    }
    return null;
  }

  /** Recursively collects all string text from Text nodes */
  function collectText(node: any): string {
    if (!node || typeof node !== "object") return String(node ?? "");
    if (typeof node === "string") return node;
    const kids = Array.isArray(node.props?.children)
      ? node.props.children
      : node.props?.children != null
        ? [node.props.children]
        : [];
    return kids.map(collectText).join(" ");
  }

  it("basic header (all fields) renders a View with children", () => {
    const el = renderActivityHeader(BASE_HEADER) as any;

    expect(el).not.toBeNull();
    expect(el.type).toBe(MockView);
    expect(el.props.children).toBeDefined();
  });

  it("header with logoSrc renders PdfImage", () => {
    const header: ActivityHeader = {
      ...BASE_HEADER,
      logoSrc: "https://example.com/logo.png",
      logoWidth: 60,
    };
    const el = renderActivityHeader(header) as any;

    const imgEl = findNode(el, (n) => n.type === MockImage);
    expect(imgEl).not.toBeNull();
    expect(imgEl.props.src).toBe("https://example.com/logo.png");
  });

  it("header without logoSrc does NOT render PdfImage", () => {
    const header: ActivityHeader = { ...BASE_HEADER, logoSrc: undefined };
    const el = renderActivityHeader(header) as any;

    const imgEl = findNode(el, (n) => n.type === MockImage);
    expect(imgEl).toBeNull();
  });

  it("header with showStudentLine=true renders student line Text", () => {
    const header: ActivityHeader = { ...BASE_HEADER, showStudentLine: true };
    const el = renderActivityHeader(header) as any;

    const allText = collectText(el);
    expect(allText).toContain("Nome do aluno");
  });

  it("header with showStudentLine=false does not render student line", () => {
    const header: ActivityHeader = { ...BASE_HEADER, showStudentLine: false };
    const el = renderActivityHeader(header) as any;

    const allText = collectText(el);
    expect(allText).not.toContain("Nome do aluno");
  });
});

// ─── renderAnswerLines ───────────────────────────────────────────────────────

describe("renderAnswerLines", () => {
  it("count=0 returns null", () => {
    expect(renderAnswerLines(0)).toBeNull();
  });

  it("count=-1 returns null (edge case)", () => {
    expect(renderAnswerLines(-1)).toBeNull();
  });

  it("count=1 returns View with 1 answer line child", () => {
    const el = renderAnswerLines(1) as any;

    expect(el).not.toBeNull();
    expect(el.type).toBe(MockView);

    // Inner View holds the lines array
    const innerView = Array.isArray(el.props.children)
      ? el.props.children[0]
      : el.props.children;
    expect(innerView.type).toBe(MockView);

    const lines = Array.isArray(innerView.props.children)
      ? innerView.props.children
      : [innerView.props.children];
    expect(lines).toHaveLength(1);
  });

  it("count=5 returns View with 5 answer line children", () => {
    const el = renderAnswerLines(5) as any;

    expect(el).not.toBeNull();
    expect(el.type).toBe(MockView);

    const innerView = Array.isArray(el.props.children)
      ? el.props.children[0]
      : el.props.children;
    const lines = Array.isArray(innerView.props.children)
      ? innerView.props.children
      : [innerView.props.children];
    expect(lines).toHaveLength(5);
  });
});

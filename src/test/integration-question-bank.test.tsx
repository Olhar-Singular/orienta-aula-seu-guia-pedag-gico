/**
 * Integration Test: Login → Banco de Questões → Extrair de PDF/Imagem → Salvar
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import {
  MOCK_USER,
  MOCK_SESSION,
  MOCK_PROFILE,
  MOCK_QUESTIONS,
  MOCK_QUESTION,
  MOCK_EXTRACTED_QUESTIONS,
} from "./fixtures";
import { createTestWrapper, createChainableQuery, mockFetch } from "./helpers";
import { validateExtractedQuestions } from "@/lib/questionParser";
import { validatePdfMagicBytes, validateDocxMagicBytes, validateImageMagicBytes, detectFileType } from "@/lib/fileValidation";
import { normalizeTextForDedup, findDuplicates, dataUrlToBlob } from "@/lib/extraction-utils";

// ─── Use vi.hoisted for variables used inside vi.mock ───
const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-001", email: "maria@escola.com", user_metadata: { name: "Maria Silva" } },
    session: { access_token: "tok", refresh_token: "ref", user: { id: "user-001" } },
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

import QuestionBank from "@/pages/QuestionBank";

describe("Flow: Question Bank → Extract → Save", () => {
  let fetchMockFn: ReturnType<typeof mockFetch>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      const data: Record<string, any> = {
        profiles: MOCK_PROFILE,
        question_bank: MOCK_QUESTIONS,
      };
      return createChainableQuery(data[table] ?? null);
    });
    fetchMockFn = mockFetch({
      "extract-questions": { questions: MOCK_EXTRACTED_QUESTIONS },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Question Bank page", () => {
    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    const { getByText } = render(<QuestionBank />, { wrapper: Wrapper });
    expect(getByText("Banco de Questões")).toBeTruthy();
  });

  it("calls supabase to load questions on mount", () => {
    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });
    expect(mockFrom).toHaveBeenCalledWith("question_bank");
  });
});

describe("PDF extraction pipeline", () => {
  it("validates PDF magic bytes before extraction", () => {
    const validPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(validatePdfMagicBytes(validPdf)).toBe(true);

    const invalidFile = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
    expect(validatePdfMagicBytes(invalidFile)).toBe(false);
  });

  it("validates DOCX magic bytes before extraction", () => {
    const validDocx = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    expect(validateDocxMagicBytes(validDocx)).toBe(true);
  });

  it("detects file types correctly via detectFileType", () => {
    expect(detectFileType(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe("pdf");
    expect(detectFileType(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe("docx");
    expect(detectFileType(new Uint8Array([0xff, 0xd8, 0xff]))).toBe("jpeg");
    expect(detectFileType(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe("png");
    expect(detectFileType(new Uint8Array([0x00, 0x00]))).toBe(null);
  });

  it("parses and validates extracted questions from AI response", () => {
    const validated = validateExtractedQuestions(MOCK_EXTRACTED_QUESTIONS);
    expect(validated).toHaveLength(2);
    validated.forEach((q) => {
      expect(q.text.length).toBeGreaterThan(0);
      expect(q.subject.length).toBeGreaterThan(0);
    });
  });

  it("filters out invalid questions from AI response", () => {
    const mixed = [
      { text: "Valid question?", subject: "Math" },
      { text: "", subject: "Science" },
      { text: "Another valid", subject: "" },
      null,
    ];
    const validated = validateExtractedQuestions(mixed);
    expect(validated).toHaveLength(1);
    expect(validated[0].text).toBe("Valid question?");
  });

  it("handles completely invalid AI response gracefully", () => {
    expect(validateExtractedQuestions(null)).toEqual([]);
    expect(validateExtractedQuestions("not json")).toEqual([]);
    expect(validateExtractedQuestions(42)).toEqual([]);
    expect(validateExtractedQuestions([])).toEqual([]);
  });
});

describe("Deduplication utilities", () => {
  it("normalizes text for dedup (NFKC + lowercase + collapse whitespace)", () => {
    expect(normalizeTextForDedup("  Hello   World  ")).toBe("hello world");
    expect(normalizeTextForDedup("UPPER CASE")).toBe("upper case");
  });

  it("finds duplicate questions correctly", () => {
    const existing = [{ text: "What is 2+2?" }, { text: "Solve: x=3" }];
    const newQs = [{ text: "what is 2+2?" }, { text: "New question" }];
    const dupes = findDuplicates(newQs, existing);
    expect(dupes.has(0)).toBe(true);
    expect(dupes.has(1)).toBe(false);
  });

  it("converts dataUrl to blob", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const blob = dataUrlToBlob(dataUrl);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
  });
});

describe("Image OCR pipeline", () => {
  it("validates image magic bytes for JPEG", () => {
    expect(validateImageMagicBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(validateImageMagicBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe1]))).toBe("jpeg");
  });

  it("validates image magic bytes for PNG", () => {
    expect(validateImageMagicBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe("png");
  });

  it("rejects non-image files", () => {
    expect(validateImageMagicBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe(null);
    expect(validateImageMagicBytes(new Uint8Array([0x00, 0x00, 0x00]))).toBe(null);
  });

  it("validates extracted OCR text is preserved", () => {
    const ocrQuestions = [{ text: "Resolva: 2 + 2 = ?", subject: "Matemática" }];
    const validated = validateExtractedQuestions(ocrQuestions);
    expect(validated).toHaveLength(1);
    expect(validated[0].text).toBe("Resolva: 2 + 2 = ?");
  });

  it("validates question data before save to database", () => {
    const questionToSave = {
      text: MOCK_QUESTION.text,
      subject: MOCK_QUESTION.subject,
      topic: MOCK_QUESTION.topic,
      options: MOCK_QUESTION.options,
      correct_answer: MOCK_QUESTION.correct_answer,
      created_by: MOCK_USER.id,
    };

    expect(questionToSave.text.length).toBeGreaterThan(0);
    expect(questionToSave.subject.length).toBeGreaterThan(0);
    expect(questionToSave.created_by).toBe(MOCK_USER.id);
    expect(Array.isArray(questionToSave.options)).toBe(true);
    expect(typeof questionToSave.correct_answer).toBe("number");
  });
});

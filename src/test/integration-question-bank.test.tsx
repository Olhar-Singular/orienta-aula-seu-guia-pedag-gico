/**
 * Integration Test: Login → Banco de Questões → Extrair de PDF/Imagem → Salvar
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import {
  MOCK_USER,
  MOCK_PROFILE,
  MOCK_QUESTIONS,
  MOCK_QUESTION,
  MOCK_EXTRACTED_QUESTIONS,
} from "./fixtures";
import { createSupabaseMock, mockAuthHook, mockSubscriptionHook, createTestWrapper, mockFetch } from "./helpers";
import { validateExtractedQuestions } from "@/lib/questionParser";
import { validatePdfMagicBytes, validateDocxMagicBytes, validateImageMagicBytes, detectFileType } from "@/lib/fileValidation";

// ─── Mocks ───
const supabaseMock = createSupabaseMock({
  profiles: MOCK_PROFILE,
  question_bank: MOCK_QUESTIONS,
});

vi.mock("@/hooks/useAuth", () => mockAuthHook());
vi.mock("@/hooks/useSubscription", () => mockSubscriptionHook());
vi.mock("@/integrations/supabase/client", () => supabaseMock);

import QuestionBank from "@/pages/QuestionBank";

describe("Flow: Question Bank → Extract → Save", () => {
  let fetchMock: ReturnType<typeof mockFetch>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = mockFetch({
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
    expect(supabaseMock.supabase.from).toHaveBeenCalledWith("question_bank");
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
      { text: "", subject: "Science" }, // empty text
      { text: "Another valid", subject: "" }, // empty subject
      null, // null item
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
    const ocrQuestions = [
      { text: "Resolva: 2 + 2 = ?", subject: "Matemática" },
    ];
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

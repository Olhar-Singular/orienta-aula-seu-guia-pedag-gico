/**
 * Duplicate-name upload flow for /dashboard/banco-questoes.
 * Covers: dialog appears on duplicate, cancel aborts, confirm uploads with renamed name.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { createTestWrapper } from "./helpers";

const { mockFrom, mockStorageUpload, mockInsert, STABLE_USER, STABLE_SESSION, STABLE_SCHOOL, STABLE_AUTH } = vi.hoisted(() => {
  const STABLE_USER = { id: "user-001", email: "maria@escola.com", user_metadata: { name: "Maria" } };
  const STABLE_SESSION = { access_token: "tok", refresh_token: "ref", user: STABLE_USER };
  const STABLE_SCHOOL = {
    schoolId: "school-001",
    schoolName: "Escola Teste",
    schoolCode: "E001",
    memberRole: "teacher",
    isLoading: false,
    hasSchool: true,
  };
  const STABLE_AUTH = {
    user: STABLE_USER,
    session: STABLE_SESSION,
    loading: false,
    signUp: () => {},
    signIn: () => {},
    signOut: () => {},
  };
  return {
    mockFrom: vi.fn(),
    mockStorageUpload: vi.fn(),
    mockInsert: vi.fn(),
    STABLE_USER,
    STABLE_SESSION,
    STABLE_SCHOOL,
    STABLE_AUTH,
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => STABLE_AUTH,
  AuthProvider: ({ children }: any) => children,
}));

vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => STABLE_SCHOOL,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    storage: {
      from: () => ({
        upload: mockStorageUpload,
        getPublicUrl: () => ({ data: { publicUrl: "https://example.com/x.png" } }),
        download: vi.fn(),
        remove: vi.fn(),
      }),
    },
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: { access_token: "tok" } } })),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

// PDF/DOCX parsing modules pull in heavy deps not available in jsdom
vi.mock("@/lib/pdf-utils", () => ({
  parsePdf: vi.fn(async () => ({ text: "", pageImages: [] })),
}));
vi.mock("@/lib/docx-utils", () => ({
  extractDocxText: vi.fn(async () => ""),
  extractDocxWithImages: vi.fn(async () => ({ text: "", images: [] })),
}));

import QuestionBank from "@/pages/QuestionBank";

function createPdfFile(name: string): File {
  // PDF magic bytes: %PDF
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
  const file = new File([bytes], name, { type: "application/pdf" });
  // jsdom Blob lacks arrayBuffer; patch it
  if (!(file as any).arrayBuffer || typeof (file as any).arrayBuffer !== "function") {
    (file as any).arrayBuffer = async () => bytes.buffer.slice(0);
  }
  const origSlice = file.slice.bind(file);
  (file as any).slice = (...args: any[]) => {
    const sliced = origSlice(...args);
    (sliced as any).arrayBuffer = async () => {
      const start = (args[0] ?? 0) as number;
      const end = (args[1] ?? bytes.length) as number;
      return bytes.slice(start, end).buffer;
    };
    return sliced;
  };
  return file;
}

function buildPdfUploadsChain(data: any[]) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn(() => Promise.resolve({ data, error: null })),
    insert: mockInsert,
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
}

function buildQuestionBankChain() {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
}

describe("QuestionBank — duplicate file name upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageUpload.mockResolvedValue({ data: { path: "x" }, error: null });
    mockInsert.mockResolvedValue({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "pdf_uploads") {
        return buildPdfUploadsChain([
          {
            id: "u-1",
            file_name: "prova.pdf",
            file_path: "user-001/123_prova.pdf",
            questions_extracted: 0,
            uploaded_at: new Date().toISOString(),
          },
        ]);
      }
      return buildQuestionBankChain();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function uploadFile(name: string) {
    const Wrapper = createTestWrapper("/dashboard/banco-questoes");
    render(<QuestionBank />, { wrapper: Wrapper });

    // Wait for history to load so pdfUploads state is populated
    await waitFor(() => {
      expect(screen.getByText("prova.pdf")).toBeTruthy();
    });

    const input = document.querySelector<HTMLInputElement>("input[type=file]");
    expect(input).toBeTruthy();

    const file = createPdfFile(name);
    fireEvent.change(input!, { target: { files: [file] } });
  }

  it("opens a confirmation dialog with the renamed filename when uploading a duplicate", async () => {
    await uploadFile("prova.pdf");

    // Dialog should show the renamed proposal
    await waitFor(() => {
      expect(screen.getByText(/prova \(1\)\.pdf/)).toBeTruthy();
    });

    // No upload happened yet — we're waiting for confirmation
    expect(mockStorageUpload).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("cancelling the dialog aborts the upload", async () => {
    await uploadFile("prova.pdf");

    await waitFor(() => expect(screen.getByText(/prova \(1\)\.pdf/)).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    await waitFor(() => {
      expect(screen.queryByText(/prova \(1\)\.pdf/)).toBeNull();
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("confirming the dialog uploads with the renamed filename", async () => {
    await uploadFile("prova.pdf");

    await waitFor(() => expect(screen.getByText(/prova \(1\)\.pdf/)).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
    });

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.file_name).toBe("prova (1).pdf");
    expect(mockStorageUpload).toHaveBeenCalled();
  });
});

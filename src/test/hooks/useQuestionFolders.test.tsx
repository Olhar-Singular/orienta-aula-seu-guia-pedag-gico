import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createTestWrapper } from "../helpers";
import { useQuestionFolders } from "@/hooks/useQuestionFolders";

const { mockRpc, mockFrom } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" }, session: null, loading: false }),
}));

function makeChain(data: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    then: vi.fn((resolve: any) => resolve({ data, error: null })),
  };
  return chain;
}

describe("useQuestionFolders — grade level", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches grade folders via RPC and maps to Folder objects", async () => {
    mockRpc.mockResolvedValue({
      data: [
        { folder_key: "9º ano", folder_count: 5, last_at: "2026-04-01T00:00:00Z" },
        { folder_key: "1º ano", folder_count: 3, last_at: "2026-03-15T00:00:00Z" },
      ],
      error: null,
    });
    mockFrom.mockImplementation(() => makeChain([]));

    const { result } = renderHook(() => useQuestionFolders("grade"), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockRpc).toHaveBeenCalledWith("get_question_folders", {
      p_level: "grade",
      p_grade: null,
    });
    expect(result.current.folders).toHaveLength(2);
    const f9 = result.current.folders.find((f) => f.key === "9º ano");
    expect(f9).toEqual({
      key: "9º ano",
      label: "9º ano",
      count: 5,
      lastAt: "2026-04-01T00:00:00Z",
      isEmpty: false,
    });
  });

  it("treats null folder_key as unclassified", async () => {
    mockRpc.mockResolvedValue({
      data: [{ folder_key: null, folder_count: 2, last_at: "2026-04-01T00:00:00Z" }],
      error: null,
    });
    mockFrom.mockImplementation(() => makeChain([]));

    const { result } = renderHook(() => useQuestionFolders("grade"), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.folders[0]).toMatchObject({
      key: null,
      label: "Sem série",
      count: 2,
      isEmpty: false,
    });
  });

  it("merges empty folders from question_empty_folders", async () => {
    mockRpc.mockResolvedValue({
      data: [{ folder_key: "9º ano", folder_count: 5, last_at: "2026-04-01T00:00:00Z" }],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "question_empty_folders") {
        return makeChain([
          { grade: "1º ano", subject: null },
          { grade: "9º ano", subject: null }, // duplicate of RPC result — should NOT add
        ]);
      }
      return makeChain([]);
    });

    const { result } = renderHook(() => useQuestionFolders("grade"), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.folders).toHaveLength(2);
    const empty = result.current.folders.find((f) => f.key === "1º ano");
    expect(empty?.isEmpty).toBe(true);
    expect(empty?.count).toBe(0);
  });
});

describe("useQuestionFolders — subject level", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes grade to RPC when fetching subjects within a grade", async () => {
    mockRpc.mockResolvedValue({
      data: [{ folder_key: "Matemática", folder_count: 3, last_at: "2026-04-01T00:00:00Z" }],
      error: null,
    });
    mockFrom.mockImplementation(() => makeChain([]));

    const { result } = renderHook(
      () => useQuestionFolders("subject", { grade: "9º ano" }),
      { wrapper: createTestWrapper() },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockRpc).toHaveBeenCalledWith("get_question_folders", {
      p_level: "subject",
      p_grade: "9º ano",
    });
    expect(result.current.folders[0].label).toBe("Matemática");
  });

  it("only includes empty folders matching the current grade parent", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "question_empty_folders") {
        return makeChain([
          { grade: "9º ano", subject: "Física" },
          { grade: "1º ano", subject: "Química" }, // diferente série — filtrar
        ]);
      }
      return makeChain([]);
    });

    const { result } = renderHook(
      () => useQuestionFolders("subject", { grade: "9º ano" }),
      { wrapper: createTestWrapper() },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.folders).toHaveLength(1);
    expect(result.current.folders[0].key).toBe("Física");
  });
});

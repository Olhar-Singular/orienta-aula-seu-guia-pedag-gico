import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createTestWrapper } from "../helpers";
import { useQuestions } from "@/hooks/useQuestions";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
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

function makeChain(data: any, error: any = null) {
  const c: any = {
    select: vi.fn(() => c),
    eq: vi.fn(() => c),
    is: vi.fn(() => c),
    order: vi.fn(() => c),
    then: vi.fn((resolve: any) => resolve({ data, error })),
  };
  return c;
}

describe("useQuestions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries question_bank and returns data", async () => {
    const questions = [{ id: "q1", text: "Q1", subject: "Matemática" }];
    mockFrom.mockReturnValue(makeChain(questions));

    const { result } = renderHook(() => useQuestions(), { wrapper: createTestWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith("question_bank");
    expect(result.current.questions).toHaveLength(1);
    expect(result.current.questions[0].id).toBe("q1");
    expect(result.current.error).toBeNull();
  });

  it("orders results by created_at descending", async () => {
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useQuestions(), { wrapper: createTestWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("applies .eq('grade') when grade is a string", async () => {
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useQuestions({ grade: "9º ano" }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(chain.eq).toHaveBeenCalledWith("grade", "9º ano");
  });

  it("applies .is('grade', null) when grade is null", async () => {
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useQuestions({ grade: null }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(chain.is).toHaveBeenCalledWith("grade", null);
  });

  it("does not filter by grade when grade is undefined", async () => {
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useQuestions({ grade: undefined }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    const isCalls = (chain.is as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.every((c) => c[0] !== "grade")).toBe(true);
    expect(isCalls.every((c) => c[0] !== "grade")).toBe(true);
  });

  it("applies .eq('subject') when subject is a string", async () => {
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useQuestions({ subject: "Matemática" }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(chain.eq).toHaveBeenCalledWith("subject", "Matemática");
  });

  it("applies .is('subject', null) when subject is null", async () => {
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useQuestions({ subject: null }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(chain.is).toHaveBeenCalledWith("subject", null);
  });

  it("applies grade AND subject filters simultaneously", async () => {
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(
      () => useQuestions({ grade: "9º ano", subject: "Matemática" }),
      { wrapper: createTestWrapper() },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(chain.eq).toHaveBeenCalledWith("grade", "9º ano");
    expect(chain.eq).toHaveBeenCalledWith("subject", "Matemática");
  });

  it("applies grade IS NULL and subject IS NULL when both are null", async () => {
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(
      () => useQuestions({ grade: null, subject: null }),
      { wrapper: createTestWrapper() },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(chain.is).toHaveBeenCalledWith("grade", null);
    expect(chain.is).toHaveBeenCalledWith("subject", null);
  });

  it("returns empty array when data is empty", async () => {
    mockFrom.mockReturnValue(makeChain([]));

    const { result } = renderHook(() => useQuestions(), { wrapper: createTestWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.questions).toEqual([]);
  });

  it("does not fetch when enabled is false", () => {
    mockFrom.mockReturnValue(makeChain([]));

    renderHook(() => useQuestions({ enabled: false }), { wrapper: createTestWrapper() });

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("propagates supabase errors via error field", async () => {
    const dbError = new Error("Supabase error");
    mockFrom.mockReturnValue(makeChain(null, dbError));

    const { result } = renderHook(() => useQuestions(), { wrapper: createTestWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.questions).toEqual([]);
  });

  it("exposes a callable refetch function", async () => {
    mockFrom.mockReturnValue(makeChain([]));

    const { result } = renderHook(() => useQuestions(), { wrapper: createTestWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.refetch).toBe("function");
  });
});

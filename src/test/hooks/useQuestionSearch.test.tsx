import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createTestWrapper } from "../helpers";
import { useQuestionSearch, escapeLike } from "@/hooks/useQuestionSearch";

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

describe("escapeLike", () => {
  it("escapes percent and underscore", () => {
    expect(escapeLike("50%")).toBe("50\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
    expect(escapeLike("normal")).toBe("normal");
  });
});

function queryChain(data: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    then: vi.fn((resolve: any) => resolve({ data, error: null })),
  };
  return chain;
}

describe("useQuestionSearch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not query when term is empty", () => {
    mockFrom.mockImplementation(() => queryChain([]));
    renderHook(() => useQuestionSearch({ query: "" }), { wrapper: createTestWrapper() });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("does not query when term is one char", () => {
    mockFrom.mockImplementation(() => queryChain([]));
    renderHook(() => useQuestionSearch({ query: "a" }), { wrapper: createTestWrapper() });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("queries text, topic, subject, grade with ILIKE", async () => {
    const chain = queryChain([{ id: "q1", text: "integral", subject: "Matemática" }]);
    mockFrom.mockImplementation(() => chain);

    const { result } = renderHook(() => useQuestionSearch({ query: "integral" }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(chain.or).toHaveBeenCalledWith(
      expect.stringContaining("text.ilike.%integral%"),
    );
    const orArg = (chain.or as any).mock.calls[0][0];
    expect(orArg).toContain("topic.ilike.");
    expect(orArg).toContain("subject.ilike.");
    expect(orArg).toContain("grade.ilike.");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createTestWrapper } from "../helpers";
import { useQuestionFolderPrefs } from "@/hooks/useQuestionFolderPrefs";

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

function selectChain(data: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    then: vi.fn((resolve: any) => resolve({ data, error: null })),
  };
  return chain;
}

describe("useQuestionFolderPrefs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads prefs for current user", async () => {
    mockFrom.mockImplementation(() =>
      selectChain([
        { folder_key: "grade:9º ano", display_order: 0 },
        { folder_key: "grade:1º ano", display_order: 1 },
      ]),
    );

    const { result } = renderHook(() => useQuestionFolderPrefs(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prefs).toHaveLength(2);
    expect(result.current.prefs[0].folder_key).toBe("grade:9º ano");
  });

  it("reorder upserts batch and refetches", async () => {
    const upsertMock = vi.fn(() => ({ then: (r: any) => r({ data: null, error: null }) }));
    mockFrom.mockImplementation(() => {
      const chain: any = selectChain([]);
      chain.upsert = upsertMock;
      return chain;
    });

    const { result } = renderHook(() => useQuestionFolderPrefs(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.reorder([
        { folder_key: "grade:9º ano", display_order: 0 },
        { folder_key: "grade:1º ano", display_order: 1 },
      ]);
    });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ folder_key: "grade:9º ano", display_order: 0, user_id: "user-1" }),
        expect.objectContaining({ folder_key: "grade:1º ano", display_order: 1, user_id: "user-1" }),
      ]),
      expect.objectContaining({ onConflict: "user_id,folder_key" }),
    );
  });
});

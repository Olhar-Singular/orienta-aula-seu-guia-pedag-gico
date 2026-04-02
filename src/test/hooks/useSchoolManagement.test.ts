import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createTestWrapper } from "../helpers";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const chain: Record<string, any> = {};
      ["select", "eq", "order"].forEach((m) => { chain[m] = vi.fn(() => chain); });

      if (table === "schools") {
        chain["order"] = vi.fn(() =>
          Promise.resolve({
            data: [
              { id: "s1", name: "Escola Alfa", code: "ALFA01", created_at: "2026-01-01" },
              { id: "s2", name: "Escola Beta", code: "BETA02", created_at: "2026-01-02" },
            ],
            error: null,
          })
        );
      } else if (table === "school_members") {
        chain["select"] = vi.fn(() =>
          Promise.resolve({
            data: [
              { school_id: "s1" },
              { school_id: "s1" },
              { school_id: "s2" },
            ],
            error: null,
          })
        );
      }
      return chain;
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useSchoolManagement } from "@/hooks/useSchoolManagement";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const mockInvokeManageSchools = vi.mocked(supabase.functions.invoke);

describe("useSchoolManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvokeManageSchools.mockResolvedValue({ data: { success: true }, error: null });
  });

  it("fetches schools with member counts", async () => {
    const { result } = renderHook(() => useSchoolManagement(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.schools).toHaveLength(2);
    expect(result.current.schools[0]).toMatchObject({
      id: "s1",
      name: "Escola Alfa",
      code: "ALFA01",
      member_count: 2,
    });
    expect(result.current.schools[1]).toMatchObject({
      id: "s2",
      name: "Escola Beta",
      member_count: 1,
    });
  });

  it("createSchool calls invoke with action='create'", async () => {
    const { result } = renderHook(() => useSchoolManagement(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.createSchool({ name: "Nova Escola", code: "NOVA01" });
    });

    await waitFor(() => {
      expect(mockInvokeManageSchools).toHaveBeenCalledWith("admin-manage-schools", {
        body: { action: "create", name: "Nova Escola", code: "NOVA01" },
      });
    });
  });

  it("createSchool shows success toast", async () => {
    const { result } = renderHook(() => useSchoolManagement(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.createSchool({ name: "Nova Escola", code: "NOVA01" });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Escola criada com sucesso!");
    });
  });

  it("updateSchool calls invoke with action='update'", async () => {
    const { result } = renderHook(() => useSchoolManagement(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateSchool({ school_id: "s1", name: "Escola Alfa Editada" });
    });

    await waitFor(() => {
      expect(mockInvokeManageSchools).toHaveBeenCalledWith("admin-manage-schools", {
        body: { action: "update", school_id: "s1", name: "Escola Alfa Editada" },
      });
    });
  });

  it("deleteSchool calls invoke with action='delete'", async () => {
    const { result } = renderHook(() => useSchoolManagement(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.deleteSchool({ school_id: "s1" });
    });

    await waitFor(() => {
      expect(mockInvokeManageSchools).toHaveBeenCalledWith("admin-manage-schools", {
        body: { action: "delete", school_id: "s1" },
      });
    });
  });

  it("shows toast.error when mutation fails", async () => {
    mockInvokeManageSchools.mockRejectedValue(new Error("Escola não encontrada"));

    const { result } = renderHook(() => useSchoolManagement(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.createSchool({ name: "Escola X", code: "XXXXX" });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Escola não encontrada");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createTestWrapper } from "../helpers";

// ─── Mocks ───

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseUserSchool = vi.fn();
vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => mockUseUserSchool(),
}));

const mockProfileQuery = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockProfileQuery,
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
    },
  },
}));

import { useUserRole } from "@/hooks/useUserRole";

// ─── Helpers ───

function defaultAuth() {
  return {
    user: { id: "user-001", email: "prof@test.com", user_metadata: { name: "Maria" } },
    session: { access_token: "token" },
    loading: false,
  };
}

function defaultSchool(role: string = "teacher") {
  return {
    schoolId: "school-001",
    schoolName: "Escola Teste",
    schoolCode: "ABC123",
    memberRole: role,
    isLoading: false,
    hasSchool: true,
  };
}

// ─── Tests ───

describe("useUserRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(defaultAuth());
    mockUseUserSchool.mockReturnValue(defaultSchool("teacher"));
    mockProfileQuery.mockResolvedValue({
      data: { is_super_admin: false, is_active: true },
      error: null,
    });
  });

  it("returns 'teacher' role for regular teacher", async () => {
    const { result } = renderHook(() => useUserRole(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.role).toBe("teacher");
    expect(result.current.isTeacher).toBe(true);
    expect(result.current.isGestor).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.isActive).toBe(true);
  });

  it("returns 'gestor' role for school gestor", async () => {
    mockUseUserSchool.mockReturnValue(defaultSchool("gestor"));

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.role).toBe("gestor");
    expect(result.current.isGestor).toBe(true);
    expect(result.current.isTeacher).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
  });

  it("returns 'admin' role for super-admin regardless of school role", async () => {
    mockUseUserSchool.mockReturnValue(defaultSchool("teacher"));
    mockProfileQuery.mockResolvedValue({
      data: { is_super_admin: true, is_active: true },
      error: null,
    });

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.role).toBe("admin");
    expect(result.current.isSuperAdmin).toBe(true);
    expect(result.current.isTeacher).toBe(false);
    expect(result.current.isGestor).toBe(false);
  });

  it("returns 'admin' even if super-admin has gestor school role", async () => {
    mockUseUserSchool.mockReturnValue(defaultSchool("gestor"));
    mockProfileQuery.mockResolvedValue({
      data: { is_super_admin: true, is_active: true },
      error: null,
    });

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.role).toBe("admin");
    expect(result.current.isSuperAdmin).toBe(true);
  });

  it("returns isActive=false for inactive user", async () => {
    mockProfileQuery.mockResolvedValue({
      data: { is_super_admin: false, is_active: false },
      error: null,
    });

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isActive).toBe(false);
    expect(result.current.role).toBe("teacher");
  });

  it("returns loading state while fetching", () => {
    mockUseUserSchool.mockReturnValue({ ...defaultSchool(), isLoading: true });
    mockProfileQuery.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("returns teacher defaults when no user is logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, session: null, loading: false });
    mockUseUserSchool.mockReturnValue({
      schoolId: null,
      schoolName: null,
      schoolCode: null,
      memberRole: null,
      isLoading: false,
      hasSchool: false,
    });

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.role).toBe("teacher");
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.isActive).toBe(true);
  });

  it("returns admin with no school membership (super-admin without school)", async () => {
    mockUseUserSchool.mockReturnValue({
      schoolId: null,
      schoolName: null,
      schoolCode: null,
      memberRole: null,
      isLoading: false,
      hasSchool: false,
    });
    mockProfileQuery.mockResolvedValue({
      data: { is_super_admin: true, is_active: true },
      error: null,
    });

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.role).toBe("admin");
    expect(result.current.isSuperAdmin).toBe(true);
    expect(result.current.hasSchool).toBe(false);
  });
});

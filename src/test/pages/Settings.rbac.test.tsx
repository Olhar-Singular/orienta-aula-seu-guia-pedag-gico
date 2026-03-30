import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks ───

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "prof@test.com", user_metadata: { name: "Maria" } },
    session: null, loading: false,
    signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(),
  }),
}));

const mockUseUserRole = vi.fn();
vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => mockUseUserRole(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { name: "Maria", display_name: "Ma", email: "prof@test.com" } }),
          limit: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }),
        }),
      }),
    }),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

import Settings from "@/pages/Settings";

function renderSettings() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/dashboard/configuracoes"]}>
        <Settings />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Settings — cargo RBAC", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exibe 'Professor' para role teacher", () => {
    mockUseUserRole.mockReturnValue({
      role: "teacher", isSuperAdmin: false, isGestor: false,
      isTeacher: true, isActive: true, isLoading: false,
    });
    renderSettings();
    expect(screen.getByTestId("rbac-role-badge")).toHaveTextContent("Professor");
  });

  it("exibe 'Gestor' para role gestor", () => {
    mockUseUserRole.mockReturnValue({
      role: "gestor", isSuperAdmin: false, isGestor: true,
      isTeacher: false, isActive: true, isLoading: false,
    });
    renderSettings();
    expect(screen.getByTestId("rbac-role-badge")).toHaveTextContent("Gestor");
  });

  it("exibe 'Administrador' para role admin", () => {
    mockUseUserRole.mockReturnValue({
      role: "admin", isSuperAdmin: true, isGestor: false,
      isTeacher: false, isActive: true, isLoading: false,
    });
    renderSettings();
    expect(screen.getByTestId("rbac-role-badge")).toHaveTextContent("Administrador");
  });

  it("campo de cargo e somente leitura (nao editavel)", () => {
    mockUseUserRole.mockReturnValue({
      role: "teacher", isSuperAdmin: false, isGestor: false,
      isTeacher: true, isActive: true, isLoading: false,
    });
    renderSettings();
    const badge = screen.getByTestId("rbac-role-badge");
    // Must NOT be an input or select
    expect(badge.tagName).not.toBe("INPUT");
    expect(badge.tagName).not.toBe("SELECT");
  });
});

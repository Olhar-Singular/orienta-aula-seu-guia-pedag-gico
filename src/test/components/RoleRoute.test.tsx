import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks ───

const mockUseUserRole = vi.fn();
vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => mockUseUserRole(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "test@test.com" },
    loading: false,
  }),
}));

import RoleRoute from "@/components/RoleRoute";

// ─── Helpers ───

function renderRoleRoute(allowedRoles: ("gestor" | "admin")[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RoleRoute allowedRoles={allowedRoles}>
          <div data-testid="protected-content">Protected Content</div>
        </RoleRoute>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ─── Tests ───

describe("RoleRoute", () => {
  describe("with allowedRoles=['admin']", () => {
    it("allows super-admin access", () => {
      mockUseUserRole.mockReturnValue({
        role: "admin",
        isSuperAdmin: true,
        isGestor: false,
        isTeacher: false,
        isActive: true,
        isLoading: false,
      });

      const { getByTestId } = renderRoleRoute(["admin"]);
      expect(getByTestId("protected-content")).toBeTruthy();
    });

    it("blocks gestor from admin-only routes", () => {
      mockUseUserRole.mockReturnValue({
        role: "gestor",
        isSuperAdmin: false,
        isGestor: true,
        isTeacher: false,
        isActive: true,
        isLoading: false,
      });

      const { queryByTestId } = renderRoleRoute(["admin"]);
      expect(queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("blocks teacher from admin-only routes", () => {
      mockUseUserRole.mockReturnValue({
        role: "teacher",
        isSuperAdmin: false,
        isGestor: false,
        isTeacher: true,
        isActive: true,
        isLoading: false,
      });

      const { queryByTestId } = renderRoleRoute(["admin"]);
      expect(queryByTestId("protected-content")).not.toBeInTheDocument();
    });
  });

  describe("with allowedRoles=['gestor', 'admin']", () => {
    it("allows super-admin access", () => {
      mockUseUserRole.mockReturnValue({
        role: "admin",
        isSuperAdmin: true,
        isGestor: false,
        isTeacher: false,
        isActive: true,
        isLoading: false,
      });

      const { getByTestId } = renderRoleRoute(["gestor", "admin"]);
      expect(getByTestId("protected-content")).toBeTruthy();
    });

    it("allows gestor access", () => {
      mockUseUserRole.mockReturnValue({
        role: "gestor",
        isSuperAdmin: false,
        isGestor: true,
        isTeacher: false,
        isActive: true,
        isLoading: false,
      });

      const { getByTestId } = renderRoleRoute(["gestor", "admin"]);
      expect(getByTestId("protected-content")).toBeTruthy();
    });

    it("blocks teacher from gestor routes", () => {
      mockUseUserRole.mockReturnValue({
        role: "teacher",
        isSuperAdmin: false,
        isGestor: false,
        isTeacher: true,
        isActive: true,
        isLoading: false,
      });

      const { queryByTestId } = renderRoleRoute(["gestor", "admin"]);
      expect(queryByTestId("protected-content")).not.toBeInTheDocument();
    });
  });

  describe("with allowedRoles=['gestor']", () => {
    it("allows gestor access", () => {
      mockUseUserRole.mockReturnValue({
        role: "gestor",
        isSuperAdmin: false,
        isGestor: true,
        isTeacher: false,
        isActive: true,
        isLoading: false,
      });

      const { getByTestId } = renderRoleRoute(["gestor"]);
      expect(getByTestId("protected-content")).toBeTruthy();
    });

    it("allows admin access (admin always has access)", () => {
      mockUseUserRole.mockReturnValue({
        role: "admin",
        isSuperAdmin: true,
        isGestor: false,
        isTeacher: false,
        isActive: true,
        isLoading: false,
      });

      const { getByTestId } = renderRoleRoute(["gestor"]);
      expect(getByTestId("protected-content")).toBeTruthy();
    });
  });

  describe("loading state", () => {
    it("shows spinner while loading", () => {
      mockUseUserRole.mockReturnValue({
        role: "teacher",
        isSuperAdmin: false,
        isGestor: false,
        isTeacher: true,
        isActive: true,
        isLoading: true,
      });

      const { container, queryByTestId } = renderRoleRoute(["admin"]);
      expect(queryByTestId("protected-content")).not.toBeInTheDocument();
      expect(container.querySelector(".animate-spin")).toBeTruthy();
    });
  });
});

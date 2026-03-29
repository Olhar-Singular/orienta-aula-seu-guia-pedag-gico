import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useUserRole
const mockUseUserRole = vi.fn();
vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => mockUseUserRole(),
}));

// Mock Navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  Navigate: (props: { to: string; replace?: boolean }) => {
    mockNavigate(props);
    return null;
  },
}));

import ProtectedRoute from "@/components/ProtectedRoute";
import { render } from "@testing-library/react";

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUserRole.mockReturnValue({
      role: "teacher", isSuperAdmin: false, isGestor: false,
      isTeacher: true, isActive: true, isLoading: false,
    });
  });

  it("redirects to /login when not authenticated", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/login", replace: true })
    );
  });

  it("renders children when authenticated and active", () => {
    mockUseAuth.mockReturnValue({ user: { id: "123" }, loading: false });
    const { getByText } = render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );
    expect(getByText("Protected content")).toBeTruthy();
  });

  it("shows loading state while auth is loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    const { container } = render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows loading state while role is loading", () => {
    mockUseAuth.mockReturnValue({ user: { id: "123" }, loading: false });
    mockUseUserRole.mockReturnValue({
      role: "teacher", isActive: true, isLoading: true,
    });
    const { container } = render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("redirects inactive user to /login", () => {
    mockUseAuth.mockReturnValue({ user: { id: "123" }, loading: false });
    mockUseUserRole.mockReturnValue({
      role: "teacher", isSuperAdmin: false, isGestor: false,
      isTeacher: true, isActive: false, isLoading: false,
    });
    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/login", replace: true })
    );
  });

  it("does not render children for inactive user", () => {
    mockUseAuth.mockReturnValue({ user: { id: "123" }, loading: false });
    mockUseUserRole.mockReturnValue({
      role: "teacher", isSuperAdmin: false, isGestor: false,
      isTeacher: true, isActive: false, isLoading: false,
    });
    const { queryByText } = render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );
    expect(queryByText("Protected content")).not.toBeInTheDocument();
  });
});

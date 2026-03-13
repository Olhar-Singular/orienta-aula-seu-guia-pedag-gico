import { describe, it, expect, vi } from "vitest";

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  Navigate: (props: any) => {
    mockNavigate(props);
    return null;
  },
}));

import ProtectedRoute from "@/components/ProtectedRoute";
import { render } from "@testing-library/react";

describe("ProtectedRoute", () => {
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

  it("renders children when authenticated", () => {
    mockUseAuth.mockReturnValue({ user: { id: "123" }, loading: false });
    const { getByText } = render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );
    expect(getByText("Protected content")).toBeTruthy();
  });

  it("shows loading state", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    const { container } = render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });
});

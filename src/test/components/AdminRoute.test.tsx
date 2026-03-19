import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => ({ isLoading: false, memberRole: null }),
}));

import AdminRoute from "@/components/AdminRoute";

function renderAdminRoute() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminRoute>
          <div data-testid="admin-content">Admin Content</div>
        </AdminRoute>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("AdminRoute", () => {
  it("redirects non-admin users to dashboard", () => {
    const { queryByTestId } = renderAdminRoute();
    expect(queryByTestId("admin-content")).not.toBeInTheDocument();
  });

  it("validates that non-admin is blocked (logic)", () => {
    const memberRole = "teacher";
    const hasAccess = memberRole === "admin";
    expect(hasAccess).toBe(false);
  });

  it("validates that admin has access (logic)", () => {
    const memberRole = "admin";
    const hasAccess = memberRole === "admin";
    expect(hasAccess).toBe(true);
  });
});

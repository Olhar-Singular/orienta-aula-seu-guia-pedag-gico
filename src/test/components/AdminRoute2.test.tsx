import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Test: loading state
describe("AdminRoute - loading", () => {
  it("shows loader when auth is loading", async () => {
    vi.doMock("@/hooks/useAuth", () => ({
      useAuth: () => ({ user: null, loading: true, session: null, signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn() }),
    }));
    vi.doMock("@/hooks/useUserSchool", () => ({
      useUserSchool: () => ({ isLoading: true, memberRole: null, schoolId: null, schoolName: null, schoolCode: null, hasSchool: false }),
    }));

    const AdminRoute = (await import("@/components/AdminRoute")).default;
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <AdminRoute><div>Admin Content</div></AdminRoute>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(container.querySelector(".animate-spin")).toBeTruthy();

    vi.doUnmock("@/hooks/useAuth");
    vi.doUnmock("@/hooks/useUserSchool");
  });
});

// Test: non-admin redirect
describe("AdminRoute - non-admin", () => {
  it("redirects non-admin users to dashboard", async () => {
    vi.doMock("@/hooks/useAuth", () => ({
      useAuth: () => ({ user: { id: "u1" }, loading: false, session: null, signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn() }),
    }));
    vi.doMock("@/hooks/useUserSchool", () => ({
      useUserSchool: () => ({ isLoading: false, memberRole: "teacher", schoolId: "s1", schoolName: "Test", schoolCode: "ABC", hasSchool: true }),
    }));

    const AdminRoute = (await import("@/components/AdminRoute")).default;
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { queryByText } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <AdminRoute><div>Admin Content</div></AdminRoute>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(queryByText("Admin Content")).toBeNull();

    vi.doUnmock("@/hooks/useAuth");
    vi.doUnmock("@/hooks/useUserSchool");
  });
});

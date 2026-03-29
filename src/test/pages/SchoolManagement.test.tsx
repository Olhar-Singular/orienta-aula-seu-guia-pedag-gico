import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks ───

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" }, session: null, loading: false }),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({
    role: "admin", isSuperAdmin: true, isGestor: false,
    isTeacher: false, isActive: true, isLoading: false,
  }),
}));

const mockUseSchoolManagement = vi.fn();
vi.mock("@/hooks/useSchoolManagement", () => ({
  useSchoolManagement: () => mockUseSchoolManagement(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import SchoolManagement from "@/pages/admin/SchoolManagement";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SchoolManagement />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("SchoolManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSchoolManagement.mockReturnValue({
      schools: [
        { id: "s1", name: "Escola Alfa", code: "ALFA01", member_count: 5 },
        { id: "s2", name: "Escola Beta", code: "BETA02", member_count: 3 },
      ],
      isLoading: false,
      createSchool: vi.fn(),
      updateSchool: vi.fn(),
      deleteSchool: vi.fn(),
    });
  });

  it("renders page title", () => {
    renderPage();
    expect(screen.getByText("Gestão de Escolas")).toBeTruthy();
  });

  it("renders list of schools", () => {
    renderPage();
    expect(screen.getByText("Escola Alfa")).toBeTruthy();
    expect(screen.getByText("Escola Beta")).toBeTruthy();
  });

  it("shows school code", () => {
    renderPage();
    expect(screen.getByText("ALFA01")).toBeTruthy();
    expect(screen.getByText("BETA02")).toBeTruthy();
  });

  it("shows member count", () => {
    renderPage();
    expect(screen.getByText(/5/)).toBeTruthy();
    expect(screen.getByText(/3/)).toBeTruthy();
  });

  it("renders Add School button", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /Nova Escola/i })).toBeTruthy();
  });

  it("shows loading state", () => {
    mockUseSchoolManagement.mockReturnValue({
      schools: [], isLoading: true,
      createSchool: vi.fn(), updateSchool: vi.fn(), deleteSchool: vi.fn(),
    });
    const { container } = renderPage();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });
});

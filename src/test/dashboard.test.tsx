import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// Mock useAuth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", user_metadata: { name: "Maria" } }, session: null, loading: false, signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }),
}));

// Mock useSubscription
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({ creditsRemaining: 5, monthlyCredits: 10, planName: "free", loading: false }),
}));

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { name: "Maria" } }),
          in: () => ({ data: [], count: 0 }),
        }),
        in: () => ({
          eq: () => ({ data: [], count: 0 }),
        }),
      }),
    }),
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }), getSession: () => Promise.resolve({ data: { session: null } }) },
  },
}));

import Dashboard from "@/pages/Dashboard";

function renderDashboard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Dashboard", () => {
  it("renders the metrics grid with 4 cards", () => {
    renderDashboard();
    const grid = screen.getByTestId("metrics-grid");
    expect(grid).toBeTruthy();
    expect(grid.children.length).toBe(4);
  });

  it("renders metric labels", () => {
    renderDashboard();
    expect(screen.getByText("Turmas")).toBeTruthy();
    expect(screen.getByText("Alunos")).toBeTruthy();
    expect(screen.getByText("Adaptações")).toBeTruthy();
    expect(screen.getByText("Top Barreiras")).toBeTruthy();
  });

  it("renders pedagogical tip section", () => {
    renderDashboard();
    expect(screen.getByTestId("pedagogical-tip")).toBeTruthy();
    expect(screen.getByText("Dica Pedagógica do Dia")).toBeTruthy();
  });

  it("renders quick action links", () => {
    renderDashboard();
    expect(screen.getByText("Adaptar Atividade")).toBeTruthy();
    expect(screen.getByText("Minhas Turmas")).toBeTruthy();
    expect(screen.getByText("Banco de Questões")).toBeTruthy();
    expect(screen.getByText("Histórico")).toBeTruthy();
  });

  it("displays greeting with user name", () => {
    renderDashboard();
    expect(screen.getByText(/Olá, Maria/)).toBeTruthy();
  });
});

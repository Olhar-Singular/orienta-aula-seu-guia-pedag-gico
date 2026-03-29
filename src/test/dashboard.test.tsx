import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", user_metadata: { name: "Maria" } }, session: null, loading: false, signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }),
}));

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
  const result = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return result;
}

describe("Dashboard", () => {
  it("renders the metrics grid with 4 cards", () => {
    const { container } = renderDashboard();
    const grid = container.querySelector('[data-testid="metrics-grid"]');
    expect(grid).toBeTruthy();
    expect(grid!.children.length).toBe(4);
  });

  it("renders metric labels", () => {
    const { getByText } = renderDashboard();
    expect(getByText("Turmas")).toBeTruthy();
    expect(getByText("Alunos")).toBeTruthy();
    expect(getByText("Adaptações")).toBeTruthy();
    expect(getByText("Top Barreiras")).toBeTruthy();
  });

  it("renders pedagogical tip section", () => {
    const { container, getByText } = renderDashboard();
    expect(container.querySelector('[data-testid="pedagogical-tip"]')).toBeTruthy();
    expect(getByText("Dica Pedagógica do Dia")).toBeTruthy();
  });

  it("renders quick action links", () => {
    const { getByText } = renderDashboard();
    expect(getByText("Adaptar Atividade")).toBeTruthy();
    expect(getByText("Minhas Turmas")).toBeTruthy();
    expect(getByText("Banco de Questões")).toBeTruthy();
    expect(getByText("Histórico")).toBeTruthy();
  });

  it("displays greeting with user name", () => {
    const { getByText } = renderDashboard();
    expect(getByText(/Olá, Maria/)).toBeTruthy();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "test@test.com", user_metadata: {} },
    session: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => {
      const chain: any = {};
      const methods = ["select", "insert", "delete", "eq", "neq", "order", "in"];
      methods.forEach((m) => { chain[m] = vi.fn(() => chain); });
      chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      chain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));
      return chain;
    }),
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
  },
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

import MyAdaptations from "@/pages/MyAdaptations";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MyAdaptations />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("MyAdaptations Page", () => {
  it("renders page title", () => {
    const { getByText } = renderPage();
    expect(getByText("Minhas Adaptações")).toBeTruthy();
  });

  it("renders description", () => {
    const { getByText } = renderPage();
    expect(getByText(/adaptações geradas pela ISA/)).toBeTruthy();
  });

  it("renders search input", () => {
    const { getByPlaceholderText } = renderPage();
    expect(getByPlaceholderText("Buscar adaptação...")).toBeTruthy();
  });

  it("renders empty state initially", async () => {
    const { findByText } = renderPage();
    expect(await findByText("Nenhuma adaptação encontrada.")).toBeTruthy();
  });
});

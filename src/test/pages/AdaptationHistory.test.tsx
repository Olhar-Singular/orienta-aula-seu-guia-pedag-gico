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
      const methods = ["select", "insert", "delete", "eq", "neq", "in", "order", "single", "maybeSingle", "is", "not"];
      methods.forEach((m) => {
        if (m === "single" || m === "maybeSingle") {
          chain[m] = vi.fn().mockResolvedValue({ data: null, error: null });
        } else {
          chain[m] = vi.fn(() => chain);
        }
      });
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

import AdaptationHistory from "@/pages/AdaptationHistory";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdaptationHistory />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("AdaptationHistory Page", () => {
  it("renders page title", () => {
    const { getByText } = renderPage();
    expect(getByText("Histórico de Atividades")).toBeTruthy();
  });

  it("renders search input", () => {
    const { getByPlaceholderText } = renderPage();
    expect(getByPlaceholderText("Buscar...")).toBeTruthy();
  });
});

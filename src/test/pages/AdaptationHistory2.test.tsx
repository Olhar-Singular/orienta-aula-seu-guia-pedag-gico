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

vi.mock("@/hooks/useUserSchool", () => ({
  useUserSchool: () => ({
    schoolId: "s1",
    schoolName: "Escola Teste",
    schoolCode: "ABC123",
    memberRole: "teacher",
    isLoading: false,
    hasSchool: true,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => {
      const chain: any = {};
      const methods = ["select", "insert", "delete", "update", "eq", "neq", "order", "in", "is", "not", "ilike"];
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
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
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

describe("AdaptationHistory Page (component)", () => {
  it("renders page title", () => {
    const { getByText } = renderPage();
    expect(getByText("Histórico de Atividades")).toBeTruthy();
  });
});

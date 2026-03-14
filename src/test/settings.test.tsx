import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { generateSchoolCode, isValidSchoolCode } from "@/lib/schoolCode";

// --- School Code unit tests ---
describe("School code generation", () => {
  it("generates a 6-character code", () => {
    const code = generateSchoolCode();
    expect(code).toHaveLength(6);
  });

  it("only contains allowed characters (no ambiguous 0/O/1/I)", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateSchoolCode();
      expect(isValidSchoolCode(code)).toBe(true);
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateSchoolCode()));
    expect(codes.size).toBeGreaterThan(90); // probabilistic but safe
  });
});

describe("isValidSchoolCode", () => {
  it("accepts valid codes", () => {
    expect(isValidSchoolCode("A3B7K9")).toBe(true);
    expect(isValidSchoolCode("XXXXXX".replace(/X/g, () => "A"))).toBe(true);
  });

  it("rejects invalid codes", () => {
    expect(isValidSchoolCode("abc")).toBe(false);
    expect(isValidSchoolCode("12345")).toBe(false);
    expect(isValidSchoolCode("A3B7K9Z")).toBe(false); // too long
    expect(isValidSchoolCode("A0B1K9")).toBe(false); // has 0 and 1
  });
});

// --- Settings page component tests ---
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "prof@test.com", user_metadata: { name: "Maria" } }, session: null, loading: false, signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }),
}));
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({ creditsRemaining: 5, monthlyCredits: 10, planName: "free", loading: false }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { name: "Maria", display_name: "Ma", email: "prof@test.com" } }),
          limit: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }),
        }),
      }),
    }),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

import Settings from "@/pages/Settings";

function renderSettings() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/dashboard/configuracoes"]}>
        <Settings />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Settings page", () => {
  it("renders all four tabs", () => {
    const { getByText } = renderSettings();
    expect(getByText("Perfil")).toBeTruthy();
    expect(getByText("Escola")).toBeTruthy();
    expect(getByText("Preferências")).toBeTruthy();
    expect(getByText("Segurança")).toBeTruthy();
  });

  it("renders profile form by default", () => {
    const { container } = renderSettings();
    expect(container.querySelector('[data-testid="profile-form"]')).toBeTruthy();
  });

  it("renders the page title", () => {
    const { getByText } = renderSettings();
    expect(getByText("Configurações")).toBeTruthy();
  });
});

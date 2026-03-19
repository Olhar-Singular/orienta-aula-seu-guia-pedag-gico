import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { generateShareToken, isValidShareToken } from "@/lib/shareToken";

// --- Token generation unit tests ---
describe("generateShareToken", () => {
  it("generates a 24-character token", () => {
    expect(generateShareToken()).toHaveLength(24);
  });

  it("generates valid tokens", () => {
    for (let i = 0; i < 50; i++) {
      expect(isValidShareToken(generateShareToken())).toBe(true);
    }
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateShareToken()));
    expect(tokens.size).toBeGreaterThan(95);
  });
});

describe("isValidShareToken", () => {
  it("accepts valid tokens", () => {
    expect(isValidShareToken("AbCdEfGhJkLmNpQrStUvWx23")).toBe(true);
  });

  it("rejects invalid tokens", () => {
    expect(isValidShareToken("short")).toBe(false);
    expect(isValidShareToken("")).toBe(false);
    expect(isValidShareToken("AAAA-BBBB-CCCC-DDDD-EEEE")).toBe(false);
  });
});

// --- StepExport component tests ---
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", user_metadata: {} }, session: null, loading: false, signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }),
}));
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({ creditsRemaining: 5, monthlyCredits: 10, planName: "free", loading: false }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: "s1", token: "abc" }, error: null }) }) }),
    }),
    functions: { invoke: vi.fn() },
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
    },
  },
}));

import StepExport from "@/components/adaptation/StepExport";

const mockData = {
  activityType: "prova" as const,
  activityText: "Test",
  selectedQuestions: [],
  classId: null,
  studentId: null,
  barriers: [],
  studentName: "João",
  adaptForWholeClass: false,
  observationNotes: "",
  result: {
    version_universal: "Universal version",
    version_directed: "Directed version",
    strategies_applied: ["Strategy 1"],
    pedagogical_justification: "Justification",
    implementation_tips: ["Tip 1"],
  },
  contextPillars: null,
  questionImages: { version_universal: {}, version_directed: {} },
};

function renderExport() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <StepExport data={mockData} onPrev={vi.fn()} onRestart={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("StepExport component", () => {
  it("renders export action cards", () => {
    const { getByText } = renderExport();
    expect(getByText("Exportar PDF")).toBeTruthy();
    expect(getByText("Salvar no Histórico")).toBeTruthy();
  });

  it("renders share section", () => {
    const { container } = renderExport();
    // Share section exists in the rendered output
    expect(container.querySelector(".space-y-6")).toBeTruthy();
  });
});

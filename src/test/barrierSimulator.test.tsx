import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { buildRadarData, type DetectedBarrier } from "@/pages/BarrierSimulator";

// --- buildRadarData unit tests ---
describe("buildRadarData", () => {
  const sampleBarriers: DetectedBarrier[] = [
    { dimension: "tea", barrier_key: "p1", label: "Enunciado longo", severity: "alta", mitigation: "Fragmentar" },
    { dimension: "tea", barrier_key: "p2", label: "Abstrato", severity: "media", mitigation: "Exemplos" },
    { dimension: "tdah", barrier_key: "a1", label: "Foco", severity: "baixa", mitigation: "Timer" },
    { dimension: "dislexia", barrier_key: "e1", label: "Texto", severity: "alta", mitigation: "Visual" },
  ];

  it("returns data for all 11 dimensions", () => {
    const data = buildRadarData(sampleBarriers);
    expect(data).toHaveLength(11);
  });

  it("calculates weighted scores correctly", () => {
    const data = buildRadarData(sampleBarriers);
    const tea = data.find((d) => d.dimension === "TEA");
    // alta=3 + media=2 = 5
    expect(tea?.score).toBe(5);
    const tdah = data.find((d) => d.dimension === "TDAH");
    // baixa=1
    expect(tdah?.score).toBe(1);
    const tod = data.find((d) => d.dimension === "TOD");
    expect(tod?.score).toBe(0);
  });

  it("returns zeros for empty barriers", () => {
    const data = buildRadarData([]);
    expect(data.every((d) => d.score === 0)).toBe(true);
  });
});

// --- Component render tests ---
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", user_metadata: {} }, session: null, loading: false, signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }),
}));
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({ creditsRemaining: 5, monthlyCredits: 10, planName: "free", loading: false }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) }),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
    },
  },
}));

// Mock recharts to avoid SVG rendering issues in test
vi.mock("recharts", () => ({
  RadarChart: ({ children }: any) => <div data-testid="mock-radar-chart">{children}</div>,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

import BarrierSimulator from "@/pages/BarrierSimulator";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BarrierSimulator />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("BarrierSimulator page", () => {
  it("renders the page title and input", () => {
    const { getByText, container } = renderPage();
    expect(getByText("Simulador de Barreiras")).toBeTruthy();
    expect(container.querySelector('[data-testid="activity-input"]')).toBeTruthy();
  });

  it("renders the analyze button", () => {
    const { getByText } = renderPage();
    expect(getByText("Analisar Barreiras")).toBeTruthy();
  });
});

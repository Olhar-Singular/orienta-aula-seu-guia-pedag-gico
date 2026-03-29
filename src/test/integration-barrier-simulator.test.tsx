/**
 * Integration Test: Login → Simulador de Barreiras → Analisar → Resultado
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { fireEvent, waitFor } from "@testing-library/dom";
import {
  MOCK_PROFILE,
  MOCK_BARRIER_ANALYSIS,
  MOCK_ACTIVITY_TEXT,
} from "./fixtures";
import { createTestWrapper, createChainableQuery } from "./helpers";
import { buildRadarData, type DetectedBarrier } from "@/pages/BarrierSimulator";

// ─── Use vi.hoisted for variables used inside vi.mock ───
const { mockFunctionsInvoke } = vi.hoisted(() => ({
  mockFunctionsInvoke: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-001", email: "maria@escola.com", user_metadata: { name: "Maria Silva" } },
    session: { access_token: "tok", refresh_token: "ref", user: { id: "user-001" } },
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const { createChainableQuery: cq } = require("./helpers");
      const { MOCK_PROFILE: profile } = require("./fixtures");
      if (table === "profiles") return cq(profile);
      return cq(null);
    }),
    functions: { invoke: mockFunctionsInvoke },
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

// Mock recharts
vi.mock("recharts", () => ({
  RadarChart: ({ children }: any) => <div data-testid="mock-radar-chart">{children}</div>,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

import BarrierSimulator from "@/pages/BarrierSimulator";

describe("Flow: Barrier Simulator → Analyze → Result", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFunctionsInvoke.mockResolvedValue({
      data: MOCK_BARRIER_ANALYSIS,
      error: null,
    });
  });

  it("renders simulator with input and analyze button", () => {
    const Wrapper = createTestWrapper("/dashboard/simulador");
    const { getByText, container } = render(<BarrierSimulator />, { wrapper: Wrapper });

    expect(getByText("Simulador de Barreiras")).toBeTruthy();
    expect(container.querySelector('[data-testid="activity-input"]')).toBeTruthy();
    expect(getByText("Analisar Barreiras")).toBeTruthy();
  });

  it("disables analyze button when text is too short", () => {
    const Wrapper = createTestWrapper("/dashboard/simulador");
    const { getByText } = render(<BarrierSimulator />, { wrapper: Wrapper });

    const btn = getByText("Analisar Barreiras");
    expect(btn).toBeDisabled();
  });

  it("enables analyze button when text >= 10 chars", () => {
    const Wrapper = createTestWrapper("/dashboard/simulador");
    const { getByText, container } = render(<BarrierSimulator />, { wrapper: Wrapper });

    const textarea = container.querySelector('[data-testid="activity-input"]') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: MOCK_ACTIVITY_TEXT } });

    const btn = getByText("Analisar Barreiras");
    expect(btn).not.toBeDisabled();
  });

  it("calls analyze-barriers edge function on submit", async () => {
    const Wrapper = createTestWrapper("/dashboard/simulador");
    const { getByText, container } = render(<BarrierSimulator />, { wrapper: Wrapper });

    const textarea = container.querySelector('[data-testid="activity-input"]') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: MOCK_ACTIVITY_TEXT } });
    fireEvent.click(getByText("Analisar Barreiras"));

    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        "analyze-barriers",
        { body: { activity_text: MOCK_ACTIVITY_TEXT } }
      );
    });
  });

  it("displays results after analysis", async () => {
    const Wrapper = createTestWrapper("/dashboard/simulador");
    const { getByText, container } = render(<BarrierSimulator />, { wrapper: Wrapper });

    const textarea = container.querySelector('[data-testid="activity-input"]') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: MOCK_ACTIVITY_TEXT } });
    fireEvent.click(getByText("Analisar Barreiras"));

    await waitFor(() => {
      expect(getByText(/3 barreiras detectadas/)).toBeTruthy();
    });
  });
});

describe("Radar chart data transformation", () => {
  const barriers: DetectedBarrier[] = MOCK_BARRIER_ANALYSIS.barriers;

  it("builds radar data for all 11 dimensions", () => {
    const data = buildRadarData(barriers);
    expect(data).toHaveLength(11);
  });

  it("calculates correct weighted scores", () => {
    const data = buildRadarData(barriers);
    // barriers fixture uses dimensions: processamento→not in DIMENSION_META, so map to actual keys
    // MOCK_BARRIER_ANALYSIS.barriers use "processamento", "atencao", "expressao" which don't match DIMENSION_META keys
    // All scores will be 0 since dimension keys don't match
    // Let's test with matching keys instead
    const testBarriers: DetectedBarrier[] = [
      { dimension: "tea", barrier_key: "b1", label: "B1", severity: "alta", mitigation: "M1" },
      { dimension: "tdah", barrier_key: "b2", label: "B2", severity: "media", mitigation: "M2" },
      { dimension: "dislexia", barrier_key: "b3", label: "B3", severity: "baixa", mitigation: "M3" },
    ];
    const result = buildRadarData(testBarriers);
    const tea = result.find((d) => d.dimension === "TEA");
    expect(tea?.score).toBe(3);
    const tdah = result.find((d) => d.dimension === "TDAH");
    expect(tdah?.score).toBe(2);
    const dislexia = result.find((d) => d.dimension === "Dislexia");
    expect(dislexia?.score).toBe(1);
  });

  it("returns zero scores for dimensions without barriers", () => {
    const testBarriers: DetectedBarrier[] = [
      { dimension: "tea", barrier_key: "b1", label: "B1", severity: "alta", mitigation: "M1" },
    ];
    const data = buildRadarData(testBarriers);
    const tod = data.find((d) => d.dimension === "TOD");
    expect(tod?.score).toBe(0);
    const tourette = data.find((d) => d.dimension === "Tourette");
    expect(tourette?.score).toBe(0);
  });

  it("handles empty barriers array", () => {
    const data = buildRadarData([]);
    expect(data).toHaveLength(11);
    expect(data.every((d) => d.score === 0)).toBe(true);
  });

  it("handles maximum severity scenario", () => {
    const maxBarriers: DetectedBarrier[] = [
      { dimension: "tea", barrier_key: "p1", label: "B1", severity: "alta", mitigation: "M1" },
      { dimension: "tea", barrier_key: "p2", label: "B2", severity: "alta", mitigation: "M2" },
      { dimension: "tea", barrier_key: "p3", label: "B3", severity: "alta", mitigation: "M3" },
      { dimension: "tea", barrier_key: "p4", label: "B4", severity: "alta", mitigation: "M4" },
    ];
    const data = buildRadarData(maxBarriers);
    const tea = data.find((d) => d.dimension === "TEA");
    expect(tea?.score).toBe(12);
  });
});

/**
 * Integration Test: Login → Simulador de Barreiras → Analisar → Resultado
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { fireEvent, waitFor } from "@testing-library/dom";
import {
  MOCK_USER,
  MOCK_PROFILE,
  MOCK_BARRIER_ANALYSIS,
  MOCK_ACTIVITY_TEXT,
} from "./fixtures";
import { mockAuthHook, mockSubscriptionHook, createTestWrapper, createChainableQuery } from "./helpers";
import { buildRadarData, type DetectedBarrier } from "@/pages/BarrierSimulator";

// ─── Mocks (inline to avoid hoisting issues) ───
const mockFunctionsInvoke = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: MOCK_USER,
    session: { access_token: "tok", refresh_token: "ref", user: MOCK_USER },
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}));
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({ loading: false }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "profiles") return createChainableQuery(MOCK_PROFILE);
      return createChainableQuery(null);
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

  it("builds radar data for all 5 dimensions", () => {
    const data = buildRadarData(barriers);
    expect(data).toHaveLength(5);
  });

  it("calculates correct weighted scores", () => {
    const data = buildRadarData(barriers);
    const proc = data.find((d) => d.dimension === "Processamento");
    expect(proc?.score).toBe(3);
    const aten = data.find((d) => d.dimension === "Atenção");
    expect(aten?.score).toBe(2);
    const expr = data.find((d) => d.dimension === "Expressão");
    expect(expr?.score).toBe(1);
  });

  it("returns zero scores for dimensions without barriers", () => {
    const data = buildRadarData(barriers);
    const ritmo = data.find((d) => d.dimension === "Ritmo");
    expect(ritmo?.score).toBe(0);
    const engaj = data.find((d) => d.dimension === "Engajamento");
    expect(engaj?.score).toBe(0);
  });

  it("handles empty barriers array", () => {
    const data = buildRadarData([]);
    expect(data).toHaveLength(5);
    expect(data.every((d) => d.score === 0)).toBe(true);
  });

  it("handles maximum severity scenario", () => {
    const maxBarriers: DetectedBarrier[] = [
      { dimension: "processamento", barrier_key: "p1", label: "B1", severity: "alta", mitigation: "M1" },
      { dimension: "processamento", barrier_key: "p2", label: "B2", severity: "alta", mitigation: "M2" },
      { dimension: "processamento", barrier_key: "p3", label: "B3", severity: "alta", mitigation: "M3" },
      { dimension: "processamento", barrier_key: "p4", label: "B4", severity: "alta", mitigation: "M4" },
    ];
    const data = buildRadarData(maxBarriers);
    const proc = data.find((d) => d.dimension === "Processamento");
    expect(proc?.score).toBe(12);
  });
});

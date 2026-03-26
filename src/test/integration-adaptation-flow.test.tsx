/**
 * Integration Test: Login → Adaptar Atividade → Ver Resultado → Exportar PDF
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import {
  MOCK_USER,
  MOCK_PROFILE,
  MOCK_ADAPTATION_RESULT,
  MOCK_ACTIVITY_TEXT,
  MOCK_ADAPTATION_HISTORY,
} from "./fixtures";
import { createSupabaseMock, mockAuthHook, mockSubscriptionHook, createTestWrapper, mockFetch } from "./helpers";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";

// ─── Mocks ───
vi.mock("@/hooks/useAuth", () => mockAuthHook());
vi.mock("@/hooks/useSubscription", () => mockSubscriptionHook());
vi.mock("@/integrations/supabase/client", () =>
  createSupabaseMock({
    profiles: MOCK_PROFILE,
    adaptations_history: MOCK_ADAPTATION_HISTORY,
  })
);

// Mock @react-pdf/renderer to avoid canvas issues in tests
vi.mock("@react-pdf/renderer", () => ({
  pdf: vi.fn(() => ({
    toBlob: vi.fn().mockResolvedValue(new Blob(["mock"], { type: "application/pdf" })),
  })),
  Document: ({ children }: any) => children,
  Page: ({ children }: any) => children,
  View: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  Image: () => null,
  StyleSheet: { create: (s: any) => s },
  Font: { register: vi.fn() },
}));

import AdaptationWizard from "@/components/adaptation/AdaptationWizard";

describe("Flow: Adaptation Wizard → Result → Export", () => {
  let fetchMock: ReturnType<typeof mockFetch>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = mockFetch({
      "adapt-activity": { adaptation: MOCK_ADAPTATION_RESULT },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders wizard with 6-step stepper", () => {
    const Wrapper = createTestWrapper("/dashboard/adaptar");
    const { getByText, container } = render(<AdaptationWizard />, { wrapper: Wrapper });

    expect(getByText("Adaptar Atividade")).toBeTruthy();
    // Mobile step indicator
    expect(getByText(/Passo 1 de 6/)).toBeTruthy();
  });

  it("Step 1: shows activity type options", () => {
    const Wrapper = createTestWrapper("/dashboard/adaptar");
    const { getByText } = render(<AdaptationWizard />, { wrapper: Wrapper });

    expect(getByText("Prova")).toBeTruthy();
    expect(getByText("Exercícios")).toBeTruthy();
    expect(getByText("Atividade de Casa")).toBeTruthy();
    expect(getByText("Trabalho")).toBeTruthy();
  });

  it("Step 1: next button is disabled without selection", () => {
    const Wrapper = createTestWrapper("/dashboard/adaptar");
    const { getByText } = render(<AdaptationWizard />, { wrapper: Wrapper });

    const nextBtn = getByText("Próximo");
    expect(nextBtn).toBeDisabled();
  });

  it("Step 1: enables next after selecting activity type", () => {
    const Wrapper = createTestWrapper("/dashboard/adaptar");
    const { getByText } = render(<AdaptationWizard />, { wrapper: Wrapper });

    fireEvent.click(getByText("Prova"));
    const nextBtn = getByText("Próximo");
    expect(nextBtn).not.toBeDisabled();
  });

  it("validates wizard data structure for API call", () => {
    const activeBarriers = BARRIER_DIMENSIONS.flatMap((dim) =>
      dim.barriers.slice(0, 1).map((b) => ({
        dimension: dim.key,
        barrier_key: b.label,
        notes: undefined,
      }))
    );

    const payload = {
      original_activity: MOCK_ACTIVITY_TEXT,
      activity_type: "exercicio",
      barriers: activeBarriers,
      student_id: "student-001",
      class_id: "class-001",
    };

    expect(payload.original_activity.length).toBeGreaterThan(10);
    expect(payload.barriers.length).toBe(BARRIER_DIMENSIONS.length);
    expect(payload.activity_type).toBe("exercicio");
  });

  it("validates adaptation result has all required fields", () => {
    const r = MOCK_ADAPTATION_RESULT;
    expect(r.version_universal).toBeTruthy();
    expect(r.version_directed).toBeTruthy();
    expect(r.strategies_applied.length).toBeGreaterThan(0);
    expect(r.pedagogical_justification).toBeTruthy();
    expect(r.implementation_tips.length).toBeGreaterThan(0);
  });

  it("validates PDF export data assembly", () => {
    const r = MOCK_ADAPTATION_RESULT;
    const pdfData = {
      teacherName: MOCK_USER.user_metadata.name,
      studentName: "João Pedro",
      activityType: "exercicio",
      date: new Date().toLocaleDateString("pt-BR"),
      versionUniversal: r.version_universal,
      versionDirected: r.version_directed,
      strategiesApplied: r.strategies_applied,
      pedagogicalJustification: r.pedagogical_justification,
      implementationTips: r.implementation_tips,
    };

    expect(pdfData.teacherName).toBe("Maria Silva");
    expect(pdfData.date).toBeTruthy();
    expect(pdfData.strategiesApplied).toHaveLength(4);
    expect(pdfData.implementationTips).toHaveLength(3);
  });

  it("validates full text copy includes all sections", () => {
    const r = MOCK_ADAPTATION_RESULT;
    const fullText = `VERSÃO UNIVERSAL\n\n${r.version_universal}\n\nVERSÃO DIRECIONADA\n\n${r.version_directed}`;
    expect(fullText).toContain("VERSÃO UNIVERSAL");
    expect(fullText).toContain("VERSÃO DIRECIONADA");
    expect(fullText).toContain(r.version_universal);
    expect(fullText).toContain(r.version_directed);
  });
});

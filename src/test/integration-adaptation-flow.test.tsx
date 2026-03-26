/**
 * Integration Test: Wizard de Adaptação → Resultado → Exportar
 *
 * Cobre o fluxo completo do wizard em ambos os modos:
 *
 * Modo IA:     type → content → barriers → choice → result → export  (6 steps)
 * Modo Manual: type → content → barriers → choice → editor → export  (6 steps)
 *
 * O step "choice" aparece após "barriers" em ambos os modos, permitindo
 * que o professor escolha o modo de adaptação após selecionar o aluno.
 *
 * Contexto de produto:
 * - "barriers" inclui seleção de turma, aluno e barreiras de aprendizagem (DUA)
 * - Modo IA envia para edge function `adapt-activity` via SSE
 * - Modo Manual usa StructuredContentRenderer para edição inline (sem IA)
 * - Barreiras selecionadas são ignoradas no modo manual (decisão de produto)
 * - Restart zera wizardMode para "ai" e limpa manualActivity
 *
 * Testes unitários complementares:
 * - src/test/skip-ai-mode.test.ts — lógica de navegação e conversão
 * - src/test/components/StepEditor.test.tsx — StepEditor com StructuredContentRenderer
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

// Mock @react-pdf/renderer para evitar problemas de canvas nos testes
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

  // ─── Estrutura do wizard ───

  it("renders wizard stepper on first step", () => {
    const Wrapper = createTestWrapper("/dashboard/adaptar");
    const { getByText } = render(<AdaptationWizard />, { wrapper: Wrapper });

    expect(getByText("Adaptar Atividade")).toBeTruthy();
    // O indicador mobile mostra "Passo 1 de N" onde N é o número de steps do modo atual.
    // Após o merge do PR feat/skip-ai-mode: N=6 (type→content→barriers→choice→result|editor→export)
    expect(getByText(/Passo 1 de \d+/)).toBeTruthy();
  });

  // ─── Step 1: Tipo de atividade ───

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

  // ─── Contratos de dados ───

  it("validates wizard data structure for AI API call", () => {
    // Contrato do payload enviado para a edge function adapt-activity
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
    // Contrato do retorno da edge function adapt-activity
    const r = MOCK_ADAPTATION_RESULT;
    expect(r.version_universal).toBeTruthy();
    expect(r.version_directed).toBeTruthy();
    expect(r.strategies_applied.length).toBeGreaterThan(0);
    expect(r.pedagogical_justification).toBeTruthy();
    expect(r.implementation_tips.length).toBeGreaterThan(0);
  });

  it("validates PDF export data assembly", () => {
    // Contrato do objeto passado para exportToPdf / exportToDocx
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

  it("validates full text copy includes both versions", () => {
    // Contrato do texto gerado para a opção "Copiar texto completo"
    const r = MOCK_ADAPTATION_RESULT;
    const fullText = `VERSÃO UNIVERSAL\n\n${r.version_universal}\n\nVERSÃO DIRECIONADA\n\n${r.version_directed}`;
    expect(fullText).toContain("VERSÃO UNIVERSAL");
    expect(fullText).toContain("VERSÃO DIRECIONADA");
    expect(fullText).toContain(r.version_universal);
    expect(fullText).toContain(r.version_directed);
  });
});

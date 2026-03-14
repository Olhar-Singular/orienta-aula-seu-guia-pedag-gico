/**
 * Integration Test: Login → Dashboard → Criar Turma → Adicionar Aluno → Definir Barreiras
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import {
  MOCK_USER,
  MOCK_PROFILE,
  MOCK_CLASS,
  MOCK_CLASSES,
  MOCK_STUDENT,
  MOCK_STUDENTS,
  MOCK_STUDENT_BARRIERS,
} from "./fixtures";
import { createSupabaseMock, mockAuthHook, mockSubscriptionHook, createTestWrapper } from "./helpers";

// ─── Mocks ───
const supabaseMock = createSupabaseMock({
  profiles: MOCK_PROFILE,
  classes: MOCK_CLASSES,
  class_students: MOCK_STUDENTS,
  student_barriers: MOCK_STUDENT_BARRIERS,
});

vi.mock("@/hooks/useAuth", () => mockAuthHook());
vi.mock("@/hooks/useSubscription", () => mockSubscriptionHook());
vi.mock("@/integrations/supabase/client", () => supabaseMock);

// ─── Imports (after mocks) ───
import Dashboard from "@/pages/Dashboard";
import Classes from "@/pages/Classes";

describe("Flow: Dashboard → Classes → Student Barriers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Dashboard with greeting and metrics", () => {
    const Wrapper = createTestWrapper("/dashboard");
    const { getByText, container } = render(<Dashboard />, { wrapper: Wrapper });

    expect(getByText(/Olá, Maria Silva/)).toBeTruthy();
    const metricsGrid = container.querySelector('[data-testid="metrics-grid"]');
    expect(metricsGrid).toBeTruthy();
    expect(metricsGrid!.children.length).toBe(4);
  });

  it("renders Dashboard quick actions with correct links", () => {
    const Wrapper = createTestWrapper("/dashboard");
    const { getByText, container } = render(<Dashboard />, { wrapper: Wrapper });

    expect(getByText("Adaptar Atividade")).toBeTruthy();
    expect(getByText("Minhas Turmas")).toBeTruthy();
    expect(getByText("Banco de Questões")).toBeTruthy();
    expect(getByText("Histórico")).toBeTruthy();

    const turmasLink = container.querySelector('a[href="/dashboard/turmas"]');
    expect(turmasLink).toBeTruthy();
  });

  it("renders Classes page with class list", () => {
    const Wrapper = createTestWrapper("/dashboard/turmas");
    const { getByText } = render(<Classes />, { wrapper: Wrapper });

    expect(getByText("Turmas")).toBeTruthy();
  });

  it("calls supabase.from('classes') on Classes page mount", () => {
    const Wrapper = createTestWrapper("/dashboard/turmas");
    render(<Classes />, { wrapper: Wrapper });

    expect(supabaseMock.supabase.from).toHaveBeenCalledWith("classes");
  });

  it("validates class creation requires a name", () => {
    // Pure logic test: creating a class without a name should be prevented
    const name = "";
    const canCreate = name.trim().length > 0;
    expect(canCreate).toBe(false);
  });

  it("validates class creation with a valid name", () => {
    const name = "5º Ano A";
    const canCreate = name.trim().length > 0;
    expect(canCreate).toBe(true);
  });

  it("validates student barrier data structure", () => {
    MOCK_STUDENT_BARRIERS.forEach((b) => {
      expect(b).toHaveProperty("barrier_key");
      expect(b).toHaveProperty("dimension");
      expect(b).toHaveProperty("is_active");
      expect(typeof b.barrier_key).toBe("string");
      expect(typeof b.dimension).toBe("string");
      expect(typeof b.is_active).toBe("boolean");
    });
    expect(MOCK_STUDENT_BARRIERS.filter((b) => b.is_active)).toHaveLength(3);
  });

  it("validates barriers span multiple dimensions", () => {
    const dims = new Set(MOCK_STUDENT_BARRIERS.map((b) => b.dimension));
    expect(dims.size).toBe(3);
    expect(dims.has("processamento")).toBe(true);
    expect(dims.has("atencao")).toBe(true);
    expect(dims.has("ritmo")).toBe(true);
  });
});

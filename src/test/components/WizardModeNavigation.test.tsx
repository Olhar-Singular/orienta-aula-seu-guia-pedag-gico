import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { mockAuthHook, createSupabaseMock, createTestWrapper } from "../helpers";
import { MOCK_CLASS, MOCK_STUDENTS } from "../fixtures";

vi.mock("@/integrations/supabase/client", () =>
  createSupabaseMock({
    classes: [MOCK_CLASS],
    class_students: MOCK_STUDENTS,
  })
);

vi.mock("@/hooks/useAuth", () => mockAuthHook());

const { default: AdaptationWizard } = await import(
  "@/components/adaptation/AdaptationWizard"
);

describe("Wizard Mode Navigation", () => {
  const wrapper = createTestWrapper("/dashboard/adaptar");

  it("renders wizard without crashing", () => {
    render(<AdaptationWizard />, { wrapper });
    expect(screen.getByText("Adaptar Atividade")).toBeDefined();
  });

  it("renders stepper navigation", () => {
    render(<AdaptationWizard />, { wrapper });
    const nav = screen.getByRole("navigation", { name: /progresso/i });
    expect(nav).toBeDefined();
  });

  it("starts on step 1 (activity type)", () => {
    render(<AdaptationWizard />, { wrapper });
    expect(screen.getAllByText(/tipo de atividade/i).length).toBeGreaterThan(0);
  });

  it("shows disclaimer about pedagogical tool", () => {
    render(<AdaptationWizard />, { wrapper });
    expect(screen.getByText(/ferramenta pedagógica/i)).toBeDefined();
  });
});

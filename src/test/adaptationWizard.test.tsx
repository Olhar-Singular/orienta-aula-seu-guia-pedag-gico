import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { screen, fireEvent } from "@testing-library/dom";
import StepActivityType from "@/components/adaptation/StepActivityType";

// Simple navigation and selection tests — no routing or supabase needed

describe("StepActivityType", () => {
  it("renders all 4 activity types", () => {
    render(<StepActivityType value={null} onChange={() => {}} onNext={() => {}} />);
    expect(screen.getByText("Prova")).toBeInTheDocument();
    expect(screen.getByText("Exercício")).toBeInTheDocument();
    expect(screen.getByText("Atividade de Casa")).toBeInTheDocument();
    expect(screen.getByText("Trabalho")).toBeInTheDocument();
  });

  it("disables next button when no type selected", () => {
    render(<StepActivityType value={null} onChange={() => {}} onNext={() => {}} />);
    expect(screen.getByText("Próximo")).toBeDisabled();
  });

  it("enables next button when type is selected", () => {
    render(<StepActivityType value="prova" onChange={() => {}} onNext={() => {}} />);
    expect(screen.getByText("Próximo")).not.toBeDisabled();
  });

  it("calls onChange when a type is clicked", () => {
    const onChange = vi.fn();
    render(<StepActivityType value={null} onChange={onChange} onNext={() => {}} />);
    fireEvent.click(screen.getByText("Prova"));
    expect(onChange).toHaveBeenCalledWith("prova");
  });

  it("calls onNext when next button is clicked", () => {
    const onNext = vi.fn();
    render(<StepActivityType value="exercicio" onChange={() => {}} onNext={onNext} />);
    fireEvent.click(screen.getByText("Próximo"));
    expect(onNext).toHaveBeenCalled();
  });
});

describe("Barrier auto-loading logic", () => {
  it("maps barrier dimensions correctly from BARRIER_DIMENSIONS", async () => {
    const { BARRIER_DIMENSIONS } = await import("@/lib/barriers");

    expect(BARRIER_DIMENSIONS).toHaveLength(5);
    const keys = BARRIER_DIMENSIONS.map((d) => d.key);
    expect(keys).toContain("processamento");
    expect(keys).toContain("atencao");
    expect(keys).toContain("ritmo");
    expect(keys).toContain("engajamento");
    expect(keys).toContain("expressao");

    // Each dimension has 4 barriers
    BARRIER_DIMENSIONS.forEach((d) => {
      expect(d.barriers.length).toBe(4);
      d.barriers.forEach((b) => {
        expect(b.key).toBeTruthy();
        expect(b.label).toBeTruthy();
      });
    });
  });

  it("creates BarrierItem array from dimensions", async () => {
    const { BARRIER_DIMENSIONS } = await import("@/lib/barriers");

    const items = BARRIER_DIMENSIONS.flatMap((dim) =>
      dim.barriers.map((b) => ({
        dimension: dim.key,
        barrier_key: b.key,
        label: b.label,
        is_active: false,
      }))
    );

    expect(items).toHaveLength(20);
    expect(items[0]).toHaveProperty("dimension");
    expect(items[0]).toHaveProperty("barrier_key");
    expect(items[0]).toHaveProperty("label");
    expect(items[0]).toHaveProperty("is_active");
    expect(items[0].is_active).toBe(false);
  });

  it("activates barriers based on student data", async () => {
    const { BARRIER_DIMENSIONS } = await import("@/lib/barriers");

    // Simulate student barriers from DB
    const studentBarriers = [
      { barrier_key: "proc_enunciados_longos", dimension: "processamento", is_active: true },
      { barrier_key: "aten_foco_atividades_longas", dimension: "atencao", is_active: true },
    ];
    const activeKeys = new Set(studentBarriers.map((b) => b.barrier_key));

    const items = BARRIER_DIMENSIONS.flatMap((dim) =>
      dim.barriers.map((b) => ({
        dimension: dim.key,
        barrier_key: b.key,
        label: b.label,
        is_active: activeKeys.has(b.key),
      }))
    );

    const active = items.filter((i) => i.is_active);
    expect(active).toHaveLength(2);
    expect(active[0].barrier_key).toBe("proc_enunciados_longos");
    expect(active[1].barrier_key).toBe("aten_foco_atividades_longas");
  });
});

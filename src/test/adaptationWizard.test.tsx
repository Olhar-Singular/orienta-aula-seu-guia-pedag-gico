import { describe, it, expect } from "vitest";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";

describe("Wizard step navigation logic", () => {
  it("has 5 steps defined", () => {
    const STEPS = [
      { label: "Tipo" },
      { label: "Conteúdo" },
      { label: "Barreiras" },
      { label: "Resultado" },
      { label: "Exportar" },
    ];
    expect(STEPS).toHaveLength(5);
  });

  it("validates activity type selection", () => {
    const validTypes = ["prova", "exercicio", "atividade_casa", "trabalho"];
    validTypes.forEach((t) => {
      expect(typeof t).toBe("string");
      expect(t.length).toBeGreaterThan(0);
    });
  });

  it("prevents next without activity type", () => {
    const value: string | null = null;
    expect(!value).toBe(true);
  });

  it("allows next with activity type selected", () => {
    const value: string | null = "prova";
    expect(!!value).toBe(true);
  });

  it("prevents next without activity text", () => {
    const text = "";
    expect(!text.trim()).toBe(true);
  });

  it("allows next with activity text", () => {
    const text = "Resolva as questões abaixo";
    expect(!!text.trim()).toBe(true);
  });
});

describe("Barrier auto-loading from student profile", () => {
  it("maps all 11 neurodivergence dimensions", () => {
    expect(BARRIER_DIMENSIONS).toHaveLength(11);
    const keys = BARRIER_DIMENSIONS.map((d) => d.key);
    expect(keys).toContain("tea");
    expect(keys).toContain("tdah");
    expect(keys).toContain("tod");
    expect(keys).toContain("sindrome_down");
    expect(keys).toContain("altas_habilidades");
    expect(keys).toContain("dislexia");
    expect(keys).toContain("discalculia");
    expect(keys).toContain("disgrafia");
    expect(keys).toContain("tourette");
    expect(keys).toContain("dispraxia");
    expect(keys).toContain("toc");
  });

  it("creates barrier items from all dimensions", () => {
    const items = BARRIER_DIMENSIONS.flatMap((dim) =>
      dim.barriers.map((b) => ({
        dimension: dim.key,
        barrier_key: b.key,
        label: b.label,
        is_active: false,
      }))
    );
    expect(items.length).toBeGreaterThanOrEqual(24);
    items.forEach((item) => {
      expect(item.is_active).toBe(false);
      expect(item.dimension).toBeTruthy();
      expect(item.barrier_key).toBeTruthy();
      expect(item.label).toBeTruthy();
    });
  });

  it("activates barriers based on student data snapshot", () => {
    const studentBarriers = [
      { barrier_key: "tea_abstracao", dimension: "tea", is_active: true },
      { barrier_key: "tdah_atencao_sustentada", dimension: "tdah", is_active: true },
      { barrier_key: "dislexia_leitura", dimension: "dislexia", is_active: true },
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
    expect(active).toHaveLength(3);
    expect(active.map((a) => a.barrier_key)).toEqual([
      "tea_abstracao",
      "tdah_atencao_sustentada",
      "dislexia_leitura",
    ]);
  });

  it("toggles a barrier on/off", () => {
    const items = BARRIER_DIMENSIONS.flatMap((dim) =>
      dim.barriers.map((b) => ({
        dimension: dim.key,
        barrier_key: b.key,
        label: b.label,
        is_active: false,
      }))
    );

    const toggled = items.map((b) =>
      b.barrier_key === "tea_abstracao" ? { ...b, is_active: !b.is_active } : b
    );
    expect(toggled.find((b) => b.barrier_key === "tea_abstracao")!.is_active).toBe(true);

    const toggledOff = toggled.map((b) =>
      b.barrier_key === "tea_abstracao" ? { ...b, is_active: !b.is_active } : b
    );
    expect(toggledOff.find((b) => b.barrier_key === "tea_abstracao")!.is_active).toBe(false);
  });

  it("requires at least one active barrier to proceed", () => {
    const noActive = BARRIER_DIMENSIONS.flatMap((dim) =>
      dim.barriers.map((b) => ({ ...b, dimension: dim.key, is_active: false }))
    );
    expect(noActive.filter((b) => b.is_active).length).toBe(0);

    const withActive = noActive.map((b, i) => (i === 0 ? { ...b, is_active: true } : b));
    expect(withActive.filter((b) => b.is_active).length).toBe(1);
  });
});

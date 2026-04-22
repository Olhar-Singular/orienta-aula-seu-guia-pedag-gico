import { describe, expect, it } from "vitest";
import { generateObservations } from "@/lib/studentReport/observations";

describe("generateObservations", () => {
  it("returns a single message when there are no adaptations", () => {
    const obs = generateObservations({
      totalAdaptations: 0,
      topBarrier: null,
      dominantBarrierShare: 0,
      topStrategy: null,
      trend: "flat",
    });
    expect(obs).toHaveLength(1);
    expect(obs[0]).toMatch(/ainda não há adaptações registradas/i);
  });

  it("flags a dominant barrier when its share exceeds 50%", () => {
    const obs = generateObservations({
      totalAdaptations: 10,
      topBarrier: { label: "Dificuldade de atenção sustentada", share: 0.6 },
      dominantBarrierShare: 0.6,
      topStrategy: { name: "Fragmentação", count: 4 },
      trend: "up",
    });
    const joined = obs.join(" ");
    expect(joined).toMatch(/Dificuldade de atenção sustentada/);
    expect(joined).toMatch(/60%/);
  });

  it("mentions the top strategy when available", () => {
    const obs = generateObservations({
      totalAdaptations: 5,
      topBarrier: null,
      dominantBarrierShare: 0,
      topStrategy: { name: "Apoio visual", count: 3 },
      trend: "flat",
    });
    expect(obs.join(" ")).toMatch(/Apoio visual/);
  });

  it("includes a trend message when trend is up or down", () => {
    const up = generateObservations({
      totalAdaptations: 10,
      topBarrier: null,
      dominantBarrierShare: 0,
      topStrategy: null,
      trend: "up",
    });
    const down = generateObservations({
      totalAdaptations: 10,
      topBarrier: null,
      dominantBarrierShare: 0,
      topStrategy: null,
      trend: "down",
    });
    expect(up.join(" ")).toMatch(/aumento|crescimento|mais adaptações/i);
    expect(down.join(" ")).toMatch(/redução|diminui|menos adaptações/i);
  });

  it("avoids diagnostic language", () => {
    const obs = generateObservations({
      totalAdaptations: 20,
      topBarrier: { label: "Dificuldade na leitura", share: 0.7 },
      dominantBarrierShare: 0.7,
      topStrategy: { name: "Leitura guiada", count: 5 },
      trend: "up",
    });
    const joined = obs.join(" ").toLowerCase();
    expect(joined).not.toMatch(/diagnóstico|transtorno|patolog/);
  });

  it("returns between 1 and 4 observations", () => {
    const obs = generateObservations({
      totalAdaptations: 20,
      topBarrier: { label: "X", share: 0.7 },
      dominantBarrierShare: 0.7,
      topStrategy: { name: "Y", count: 5 },
      trend: "up",
    });
    expect(obs.length).toBeGreaterThanOrEqual(1);
    expect(obs.length).toBeLessThanOrEqual(4);
  });
});

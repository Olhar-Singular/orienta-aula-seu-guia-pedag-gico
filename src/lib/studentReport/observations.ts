export type Trend = "up" | "down" | "flat";

export type ObservationsInput = {
  totalAdaptations: number;
  topBarrier: { label: string; share: number } | null;
  dominantBarrierShare: number;
  topStrategy: { name: string; count: number } | null;
  trend: Trend;
};

const DOMINANT_BARRIER_THRESHOLD = 0.5;
const MAX_OBSERVATIONS = 4;

function formatPercent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function trendMessage(trend: Trend): string | null {
  if (trend === "up") {
    return "Houve aumento de adaptações comparado ao período anterior. Continue acompanhando o que vem funcionando.";
  }
  if (trend === "down") {
    return "Houve redução de adaptações em relação ao período anterior. Vale revisitar se novas necessidades surgiram.";
  }
  return null;
}

export function generateObservations(input: ObservationsInput): string[] {
  if (input.totalAdaptations === 0) {
    return [
      "Ainda não há adaptações registradas para este aluno. Crie a primeira para começar a acompanhar a evolução.",
    ];
  }

  const messages: string[] = [];

  messages.push(
    `Foram registradas ${input.totalAdaptations} adaptações no período, uma base útil para observar padrões pedagógicos.`
  );

  if (input.topBarrier && input.dominantBarrierShare >= DOMINANT_BARRIER_THRESHOLD) {
    messages.push(
      `A barreira "${input.topBarrier.label}" aparece em ${formatPercent(
        input.dominantBarrierShare
      )} das adaptações. Considere reforçar estratégias específicas para essa necessidade.`
    );
  }

  if (input.topStrategy) {
    messages.push(
      `A estratégia mais aplicada foi "${input.topStrategy.name}" (${input.topStrategy.count}x). Observe em situações reais de sala se ela tem apoiado o aluno.`
    );
  }

  const trendMsg = trendMessage(input.trend);
  if (trendMsg) messages.push(trendMsg);

  return messages.slice(0, MAX_OBSERVATIONS);
}

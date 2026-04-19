import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { UsageSummaryCards } from "@/components/admin/ai-usage/UsageSummaryCards";
import type { AiUsageSummary } from "@/types/aiUsage";

function makeSummary(overrides: Partial<AiUsageSummary> = {}): AiUsageSummary {
  return {
    total_requests: 100,
    total_input_tokens: 2000,
    total_output_tokens: 1500,
    total_tokens: 3500,
    total_cost: 0.1234,
    error_count: 5,
    avg_duration_ms: 850,
    ...overrides,
  };
}

describe("UsageSummaryCards", () => {
  it("renders four card titles", () => {
    const { getByText } = render(<UsageSummaryCards summary={makeSummary()} />);
    expect(getByText("Total de Tokens")).toBeInTheDocument();
    expect(getByText("Custo Estimado")).toBeInTheDocument();
    expect(getByText("Tempo Médio")).toBeInTheDocument();
    expect(getByText("Taxa de Erro")).toBeInTheDocument();
  });

  it("formats tokens using k suffix for thousands", () => {
    const { getByText } = render(
      <UsageSummaryCards summary={makeSummary({ total_tokens: 12_500 })} />
    );
    expect(getByText("12.5k")).toBeInTheDocument();
  });

  it("formats tokens using M suffix for millions", () => {
    const { getByText } = render(
      <UsageSummaryCards summary={makeSummary({ total_tokens: 2_400_000 })} />
    );
    expect(getByText("2.40M")).toBeInTheDocument();
  });

  it("renders cost with 4 decimal places and a dollar sign", () => {
    const { getByText } = render(
      <UsageSummaryCards summary={makeSummary({ total_cost: 3.5 })} />
    );
    expect(getByText("$3.5000")).toBeInTheDocument();
  });

  it("renders average duration in ms under 1 second", () => {
    const { getByText } = render(
      <UsageSummaryCards summary={makeSummary({ avg_duration_ms: 850 })} />
    );
    expect(getByText("850ms")).toBeInTheDocument();
  });

  it("renders average duration in seconds above 1 second", () => {
    const { getByText } = render(
      <UsageSummaryCards summary={makeSummary({ avg_duration_ms: 2500 })} />
    );
    expect(getByText("2.5s")).toBeInTheDocument();
  });

  it("computes 0.0% error rate when total_requests is zero", () => {
    const { getByText } = render(
      <UsageSummaryCards
        summary={makeSummary({ total_requests: 0, error_count: 0 })}
      />
    );
    expect(getByText("0.0%")).toBeInTheDocument();
  });

  it("computes error rate as percentage with 1 decimal", () => {
    const { getByText } = render(
      <UsageSummaryCards
        summary={makeSummary({ total_requests: 200, error_count: 7 })}
      />
    );
    expect(getByText("3.5%")).toBeInTheDocument();
  });

  it("pluralizes 'erro' correctly (singular for 1, plural otherwise)", () => {
    const { getByText, rerender } = render(
      <UsageSummaryCards summary={makeSummary({ error_count: 1 })} />
    );
    expect(getByText("1 erro")).toBeInTheDocument();

    rerender(<UsageSummaryCards summary={makeSummary({ error_count: 3 })} />);
    expect(getByText("3 erros")).toBeInTheDocument();
  });
});

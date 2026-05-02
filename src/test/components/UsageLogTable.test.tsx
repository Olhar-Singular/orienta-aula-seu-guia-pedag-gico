import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { UsageLogTable } from "@/components/admin/ai-usage/UsageLogTable";
import type { AiUsageLog } from "@/types/aiUsage";

function makeLog(overrides: Partial<AiUsageLog> = {}): AiUsageLog {
  return {
    id: "log-1",
    user_id: "u1",
    school_id: "s1",
    action_type: "adaptation",
    model: "openai/gpt-4o",
    endpoint: "adapt-activity",
    input_tokens: 1500,
    output_tokens: 800,
    total_tokens: 2300,
    cost_input: 0.001,
    cost_output: 0.002,
    cost_total: 0.003,
    request_duration_ms: 450,
    status: "success",
    error_message: null,
    metadata: {},
    created_at: "2025-03-10T14:30:00.000Z",
    ...overrides,
  };
}

describe("UsageLogTable", () => {
  it("renders empty state when logs array is empty", () => {
    const { getByText } = render(<UsageLogTable logs={[]} />);
    expect(getByText("Nenhum registro encontrado")).toBeInTheDocument();
    expect(getByText("no período selecionado")).toBeInTheDocument();
  });

  it("renders table headers when logs are present", () => {
    const { getByText } = render(<UsageLogTable logs={[makeLog()]} />);
    expect(getByText("Data/Hora")).toBeInTheDocument();
    expect(getByText("Modelo")).toBeInTheDocument();
    expect(getByText("Entrada")).toBeInTheDocument();
    expect(getByText("Custo")).toBeInTheDocument();
    expect(getByText("Status")).toBeInTheDocument();
  });

  it("displays the last segment of the model path as the model badge", () => {
    const { getByText } = render(
      <UsageLogTable logs={[makeLog({ model: "anthropic/claude-sonnet-4-6" })]} />
    );
    expect(getByText("claude-sonnet-4-6")).toBeInTheDocument();
  });

  it("maps known action types to Portuguese labels", () => {
    const { getByText } = render(
      <UsageLogTable
        logs={[
          makeLog({ id: "a", action_type: "adaptation" }),
          makeLog({ id: "b", action_type: "chat" }),
          makeLog({ id: "c", action_type: "pei_generation" }),
        ]}
      />
    );
    expect(getByText("Adaptação")).toBeInTheDocument();
    expect(getByText("Chat")).toBeInTheDocument();
    expect(getByText("PEI")).toBeInTheDocument();
  });

  it("falls back to the raw action_type when unknown", () => {
    const { getByText } = render(
      <UsageLogTable logs={[makeLog({ action_type: "custom_action" })]} />
    );
    expect(getByText("custom_action")).toBeInTheDocument();
  });

  it("formats tokens in k suffix for thousands and M for millions", () => {
    const { getByText, getAllByText } = render(
      <UsageLogTable
        logs={[
          makeLog({
            input_tokens: 12_500,
            output_tokens: 3_400_000,
            total_tokens: 3_412_500,
          }),
        ]}
      />
    );
    expect(getByText("12.5k")).toBeInTheDocument();
    expect(getAllByText("3.4M").length).toBeGreaterThanOrEqual(1);
  });

  it("formats cost with 6 decimal places", () => {
    const { getByText } = render(
      <UsageLogTable logs={[makeLog({ cost_total: 0.000123 })]} />
    );
    expect(getByText("$0.000123")).toBeInTheDocument();
  });

  it("formats cost when PostgREST returns NUMERIC as string", () => {
    // PostgREST returns NUMERIC columns as strings by default; the table must
    // coerce them so .toFixed() doesn't throw TypeError.
    const stringCost = "0.000456" as unknown as number;
    const { getByText } = render(
      <UsageLogTable logs={[makeLog({ cost_total: stringCost })]} />
    );
    expect(getByText("$0.000456")).toBeInTheDocument();
  });

  it("maps regenerate_question and image_generation to Portuguese labels", () => {
    const { getByText } = render(
      <UsageLogTable
        logs={[
          makeLog({ id: "a", action_type: "regenerate_question" }),
          makeLog({ id: "b", action_type: "image_generation" }),
        ]}
      />
    );
    expect(getByText("Regenerar Questão")).toBeInTheDocument();
    expect(getByText("Geração de Imagem")).toBeInTheDocument();
  });

  it("renders duration as ms when below 1 second", () => {
    const { getByText } = render(
      <UsageLogTable logs={[makeLog({ request_duration_ms: 250 })]} />
    );
    expect(getByText("250ms")).toBeInTheDocument();
  });

  it("renders duration as seconds when above 1 second", () => {
    const { getByText } = render(
      <UsageLogTable logs={[makeLog({ request_duration_ms: 3400 })]} />
    );
    expect(getByText("3.4s")).toBeInTheDocument();
  });

  it("renders em dash when duration is null", () => {
    const { getByText } = render(
      <UsageLogTable logs={[makeLog({ request_duration_ms: null })]} />
    );
    expect(getByText("—")).toBeInTheDocument();
  });

  it("renders status badges for success, error, and timeout", () => {
    const { getByText } = render(
      <UsageLogTable
        logs={[
          makeLog({ id: "a", status: "success" }),
          makeLog({ id: "b", status: "error" }),
          makeLog({ id: "c", status: "timeout" }),
        ]}
      />
    );
    expect(getByText("OK")).toBeInTheDocument();
    expect(getByText("Erro")).toBeInTheDocument();
    expect(getByText("Timeout")).toBeInTheDocument();
  });

  it("appends a tilde marker when tokens_source is 'estimated'", () => {
    const estimated = { ...makeLog(), tokens_source: "estimated" } as AiUsageLog;
    const { getAllByText } = render(<UsageLogTable logs={[estimated]} />);
    // There are two ~ markers (input and output cells).
    expect(getAllByText("~")).toHaveLength(2);
  });
});

// Core (testable) logic for logging AI usage.
// The Deno-specific entry point lives in logAiUsage.ts and injects a Supabase
// admin client into these helpers. Splitting allows Vitest (Node) to exercise
// the logic without resolving https:// URL imports.

export interface AiUsageLog {
  user_id: string;
  school_id?: string | null;
  action_type: string;
  model: string;
  endpoint?: string;
  input_tokens?: number;
  output_tokens?: number;
  request_duration_ms?: number;
  status?: "success" | "error" | "timeout";
  error_message?: string;
  metadata?: Record<string, unknown>;
  prompt_text?: string;
  response_text?: string;
}

// Minimal shape of the supabase-js client we use here, so tests can mock it
// without depending on @supabase/supabase-js.
// deno-lint-ignore no-explicit-any
type Thenable<T> = Promise<T> | { then: (cb: (v: T) => any) => any };

export interface PricingRow {
  price_input_per_million: number | string;
  price_output_per_million: number | string;
}

export interface AdminClient {
  rpc: (fn: string, args: Record<string, unknown>) =>
    Thenable<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: unknown) => {
        eq: (col: string, val: unknown) => {
          single: () => Thenable<{ data: PricingRow | null; error: unknown }>;
        };
      };
    };
    insert: (record: Record<string, unknown>) =>
      Thenable<{ error: { message: string } | null }>;
  };
}

// ~3.5 chars per token for Portuguese (rough heuristic)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

const PRICING_FALLBACK: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-flash": { input: 0.075, output: 0.30 },
  "google/gemini-2.5-pro": { input: 1.25, output: 5.00 },
  "google/gemini-3-flash-preview": { input: 0.10, output: 0.40 },
  "google/gemini-3.1-flash-image-preview": { input: 0.10, output: 0.40 },
};

export async function getModelPricing(
  admin: AdminClient,
  model: string,
): Promise<{ input: number; output: number }> {
  try {
    const { data } = await admin
      .from("ai_model_pricing")
      .select("price_input_per_million, price_output_per_million")
      .eq("model", model)
      .eq("is_active", true)
      .single();

    if (data) {
      return {
        input: Number(data.price_input_per_million),
        output: Number(data.price_output_per_million),
      };
    }
  } catch {
    // fall through to hardcoded fallback
  }

  return PRICING_FALLBACK[model] || { input: 0, output: 0 };
}

export async function logAiUsageWithClient(
  admin: AdminClient,
  log: AiUsageLog,
): Promise<void> {
  let schoolId = log.school_id || null;
  if (!schoolId && log.user_id) {
    const { data, error: schoolErr } = await admin.rpc(
      "get_user_school_id",
      { _user_id: log.user_id },
    );
    if (schoolErr) {
      console.warn(
        "Failed to resolve school_id for user",
        log.user_id,
        schoolErr.message,
      );
    }
    schoolId = (data as string | null) || null;
  }

  let inputTokens = log.input_tokens || 0;
  let outputTokens = log.output_tokens || 0;
  let tokensSource: "api" | "estimated" | "unknown" = "api";

  if (inputTokens === 0 && outputTokens === 0) {
    if (log.prompt_text || log.response_text) {
      if (log.prompt_text) inputTokens = estimateTokens(log.prompt_text);
      if (log.response_text) outputTokens = estimateTokens(log.response_text);
      tokensSource = "estimated";
    } else {
      tokensSource = "unknown";
    }
  } else if (inputTokens === 0 && log.prompt_text) {
    inputTokens = estimateTokens(log.prompt_text);
    tokensSource = "estimated";
  }

  const totalTokens = inputTokens + outputTokens;
  const pricing = await getModelPricing(admin, log.model);
  const costInput = (inputTokens / 1_000_000) * pricing.input;
  const costOutput = (outputTokens / 1_000_000) * pricing.output;
  const costTotal = costInput + costOutput;

  const { error } = await admin.from("ai_usage_logs").insert({
    user_id: log.user_id,
    school_id: schoolId,
    action_type: log.action_type,
    model: log.model,
    endpoint: log.endpoint || null,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    cost_input: costInput,
    cost_output: costOutput,
    cost_total: costTotal,
    request_duration_ms: log.request_duration_ms || null,
    status: log.status || "success",
    error_message: log.error_message || null,
    metadata: log.metadata || {},
    tokens_source: tokensSource,
  });

  if (error) {
    console.error("ai_usage_logs insert failed:", error.message, {
      user_id: log.user_id,
      action_type: log.action_type,
      model: log.model,
    });
  }
}

// Schedules `promise` so it survives the function returning. Edge runtimes
// expose `EdgeRuntime.waitUntil` for this; otherwise we await inline so the
// caller can `await` and guarantee persistence before responding.
export async function runWithWaitUntil(
  promise: Promise<void>,
  // deno-lint-ignore no-explicit-any
  globalRef: any = globalThis,
): Promise<void> {
  const waitUntil = globalRef?.EdgeRuntime?.waitUntil;
  const safe = promise.catch((e) =>
    console.error("logAiUsage failed:", e instanceof Error ? e.message : e)
  );
  if (typeof waitUntil === "function") {
    waitUntil(safe);
    return;
  }
  await safe;
}

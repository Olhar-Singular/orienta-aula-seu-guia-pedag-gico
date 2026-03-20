import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AiUsageLog {
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
}

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-flash": { input: 0.075, output: 0.30 },
  "google/gemini-2.5-pro": { input: 1.25, output: 5.00 },
  "google/gemini-3-flash-preview": { input: 0.10, output: 0.40 },
  "google/gemini-3.1-flash-image-preview": { input: 0.10, output: 0.40 },
};

export async function logAiUsage(log: AiUsageLog): Promise<void> {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auto-resolve school_id if not provided
    let schoolId = log.school_id || null;
    if (!schoolId && log.user_id) {
      const { data } = await admin.rpc("get_user_school_id", { _user_id: log.user_id });
      schoolId = data || null;
    }

    const inputTokens = log.input_tokens || 0;
    const outputTokens = log.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    const pricing = MODEL_PRICING[log.model] || { input: 0, output: 0 };
    const costInput = (inputTokens / 1_000_000) * pricing.input;
    const costOutput = (outputTokens / 1_000_000) * pricing.output;
    const costTotal = costInput + costOutput;

    await admin.from("ai_usage_logs").insert({
      user_id: log.user_id,
      school_id: schoolId,
      action_type: log.action_type,
      model: log.model,
      endpoint: log.endpoint || "https://ai.gateway.lovable.dev/v1/chat/completions",
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
    });
  } catch (err) {
    console.error("Failed to log AI usage:", err);
  }
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Checks if user has remaining credits. Returns { ok: true } or { ok: false, response }.
 * Also inserts a credit_usage record on success (call after AI response).
 */
export async function checkCredits(
  admin: ReturnType<typeof createClient>,
  userId: string,
  action: string,
  corsHeaders: Record<string, string>,
): Promise<{ ok: boolean; response?: Response }> {
  // Get user's plan credits
  const { data: sub } = await admin
    .from("user_subscriptions")
    .select("plan_id, current_period_start, current_period_end")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!sub) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Nenhuma assinatura ativa encontrada." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    };
  }

  const { data: plan } = await admin
    .from("plans")
    .select("monthly_credits")
    .eq("id", sub.plan_id)
    .single();

  if (!plan) {
    return { ok: true }; // if plan not found, allow (fail open for edge cases)
  }

  const { data: usedRaw } = await admin.rpc("get_credits_used", { p_user_id: userId });
  const used = typeof usedRaw === "number" ? usedRaw : 0;

  if (used >= plan.monthly_credits) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Créditos mensais esgotados. Atualize seu plano para continuar." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    };
  }

  return { ok: true };
}

export async function deductCredit(
  admin: ReturnType<typeof createClient>,
  userId: string,
  action: string,
  referenceId?: string,
): Promise<void> {
  await admin.from("credit_usage").insert({
    user_id: userId,
    action,
    credits_used: 1,
    reference_id: referenceId || null,
  });
}

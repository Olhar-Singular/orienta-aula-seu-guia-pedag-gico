import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Ensures the user has an active subscription. If none exists or it's expired,
 * auto-creates/renews a free plan subscription.
 */
async function ensureActiveSubscription(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ plan_id: string; current_period_start: string; current_period_end: string } | null> {
  // Try to find an active subscription within the current period
  const { data: sub } = await admin
    .from("user_subscriptions")
    .select("id, plan_id, current_period_start, current_period_end, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (sub) {
    // Check if period is still valid
    const periodEnd = new Date(sub.current_period_end);
    if (periodEnd > new Date()) {
      return sub;
    }

    // Period expired — auto-renew by updating period dates
    const now = new Date();
    const newEnd = new Date(now);
    newEnd.setDate(newEnd.getDate() + 30);

    const { data: renewed } = await admin
      .from("user_subscriptions")
      .update({
        current_period_start: now.toISOString(),
        current_period_end: newEnd.toISOString(),
      })
      .eq("id", sub.id)
      .select("plan_id, current_period_start, current_period_end")
      .single();

    return renewed;
  }

  // No subscription at all — auto-assign free plan
  const { data: freePlan } = await admin
    .from("plans")
    .select("id")
    .eq("name", "free")
    .eq("is_active", true)
    .single();

  if (!freePlan) return null;

  const now = new Date();
  const newEnd = new Date(now);
  newEnd.setDate(newEnd.getDate() + 30);

  const { data: created } = await admin
    .from("user_subscriptions")
    .insert({
      user_id: userId,
      plan_id: freePlan.id,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: newEnd.toISOString(),
    })
    .select("plan_id, current_period_start, current_period_end")
    .single();

  return created;
}

/**
 * Checks if user has remaining credits. Returns { ok: true } or { ok: false, response }.
 */
export async function checkCredits(
  admin: ReturnType<typeof createClient>,
  userId: string,
  action: string,
  corsHeaders: Record<string, string>,
): Promise<{ ok: boolean; response?: Response }> {
  const sub = await ensureActiveSubscription(admin, userId);

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
    return { ok: true }; // fail open if plan not found
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

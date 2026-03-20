import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: membership } = await userClient
      .from("school_members")
      .select("school_id, role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const schoolId = membership.school_id;

    // Parse filters from query params
    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "week";
    const modelFilter = url.searchParams.get("model") || "";
    const actionFilter = url.searchParams.get("action_type") || "";

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 86_400_000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 86_400_000);
        break;
    }

    // Use service role for aggregation query
    const admin = createClient(supabaseUrl, serviceRoleKey);
    let query = admin
      .from("ai_usage_logs")
      .select("*")
      .eq("school_id", schoolId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000);

    if (modelFilter) query = query.eq("model", modelFilter);
    if (actionFilter) query = query.eq("action_type", actionFilter);

    const { data: logs, error: queryError } = await query;
    if (queryError) {
      console.error("Query error:", queryError);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = logs || [];

    // Summary aggregation
    const summary = {
      total_requests: items.length,
      total_input_tokens: items.reduce((s: number, l: any) => s + (l.input_tokens || 0), 0),
      total_output_tokens: items.reduce((s: number, l: any) => s + (l.output_tokens || 0), 0),
      total_tokens: items.reduce((s: number, l: any) => s + (l.total_tokens || 0), 0),
      total_cost: items.reduce((s: number, l: any) => s + parseFloat(l.cost_total || "0"), 0),
      error_count: items.filter((l: any) => l.status === "error").length,
      avg_duration_ms: items.length
        ? items.reduce((s: number, l: any) => s + (l.request_duration_ms || 0), 0) / items.length
        : 0,
    };

    // By model
    const by_model: Record<string, any> = {};
    for (const log of items) {
      const m = (log as any).model;
      if (!by_model[m]) {
        by_model[m] = { requests: 0, input_tokens: 0, output_tokens: 0, total_tokens: 0, total_cost: 0 };
      }
      by_model[m].requests++;
      by_model[m].input_tokens += (log as any).input_tokens || 0;
      by_model[m].output_tokens += (log as any).output_tokens || 0;
      by_model[m].total_tokens += (log as any).total_tokens || 0;
      by_model[m].total_cost += parseFloat((log as any).cost_total || "0");
    }

    // By day
    const by_day: Record<string, any> = {};
    for (const log of items) {
      const day = new Date((log as any).created_at).toISOString().split("T")[0];
      if (!by_day[day]) by_day[day] = { requests: 0, tokens: 0, cost: 0 };
      by_day[day].requests++;
      by_day[day].tokens += (log as any).total_tokens || 0;
      by_day[day].cost += parseFloat((log as any).cost_total || "0");
    }

    // By action type
    const by_action_type: Record<string, any> = {};
    for (const log of items) {
      const a = (log as any).action_type;
      if (!by_action_type[a]) by_action_type[a] = { requests: 0, tokens: 0, cost: 0 };
      by_action_type[a].requests++;
      by_action_type[a].tokens += (log as any).total_tokens || 0;
      by_action_type[a].cost += parseFloat((log as any).cost_total || "0");
    }

    return new Response(
      JSON.stringify({
        period,
        start_date: startDate.toISOString(),
        end_date: now.toISOString(),
        summary,
        by_model,
        by_day,
        by_action_type,
        logs: items.slice(0, 100),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("admin-ai-usage-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

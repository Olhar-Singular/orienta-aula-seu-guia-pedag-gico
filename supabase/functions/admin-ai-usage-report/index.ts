import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
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

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    const validatedUserId = claimsData?.claims?.sub;

    if (claimsError || !validatedUserId) {
      console.error("JWT claims validation failed:", claimsError?.message ?? "missing sub claim");
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Verify super-admin via profiles.is_super_admin flag
    const { data: isSuperAdmin, error: adminCheckError } = await admin
      .rpc("is_super_admin", { _user_id: validatedUserId });

    if (adminCheckError) {
      console.error("Admin check error:", adminCheckError.message);
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse filters from query params
    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "week";
    const modelFilter = url.searchParams.get("model") || "";
    const actionFilter = url.searchParams.get("action_type") || "";
    const schoolIdFilter = url.searchParams.get("school_id") || "";

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

    // admin client already created above

    // Paginate to handle >1000 logs
    const PAGE_SIZE = 1000;
    let allItems: any[] = [];
    let page = 0;
    while (true) {
      let query = admin
        .from("ai_usage_logs")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (schoolIdFilter) query = query.eq("school_id", schoolIdFilter);
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

      allItems = allItems.concat(logs || []);
      if (!logs || logs.length < PAGE_SIZE) break;
      page++;
      // Safety cap at 10k rows
      if (allItems.length >= 10_000) break;
    }

    const items = allItems;

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

    // By school (for super-admin cross-school view)
    const by_school: Record<string, any> = {};
    for (const log of items) {
      const sid = (log as any).school_id || "unknown";
      if (!by_school[sid]) by_school[sid] = { school_name: sid, requests: 0, total_tokens: 0, total_cost: 0 };
      by_school[sid].requests++;
      by_school[sid].total_tokens += (log as any).total_tokens || 0;
      by_school[sid].total_cost += parseFloat((log as any).cost_total || "0");
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
        by_school,
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

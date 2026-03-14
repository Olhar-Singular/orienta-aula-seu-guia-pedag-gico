import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitize } from "../_shared/sanitize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é uma especialista em pedagogia inclusiva chamada ISA (Inteligência de Suporte à Aprendizagem).

MISSÃO: Adaptar atividades escolares para remover barreiras à aprendizagem, sem alterar os objetivos pedagógicos.

PRINCÍPIOS INVIOLÁVEIS (Travas de Segurança):
1. NUNCA faça diagnóstico clínico (não mencione TDAH, TEA, dislexia, etc.)
2. SEMPRE preserve os objetivos de aprendizagem originais
3. Foque em BARREIRAS OBSERVÁVEIS, não em condições médicas
4. Use linguagem pedagógica, não clínica
5. Toda adaptação deve ser aplicável em sala de aula regular

DIMENSÕES DE BARREIRAS OBSERVÁVEIS:
- Processamento: dificuldade com enunciados longos, conceitos abstratos, múltiplos passos
- Atenção: perda de foco, distração, dificuldade de retomada
- Ritmo: necessidade de mais tempo, ritmo irregular
- Engajamento: desinteresse, resistência, necessidade de mediação
- Expressão: dificuldade escrita, melhor desempenho oral, organização de ideias

IMPORTANTE: Você é uma ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.`;

const ADAPTATION_TOOL = {
  type: "function" as const,
  function: {
    name: "deliver_adaptation",
    description: "Entrega a atividade adaptada com orientações pedagógicas",
    parameters: {
      type: "object",
      properties: {
        version_universal: {
          type: "string",
          description: "Versão da atividade adaptada para toda a turma (Design Universal)",
        },
        version_directed: {
          type: "string",
          description: "Versão com adaptações específicas para o aluno",
        },
        strategies_applied: {
          type: "array",
          items: { type: "string" },
          description: "Lista de estratégias pedagógicas utilizadas",
        },
        pedagogical_justification: {
          type: "string",
          description: "Explicação pedagógica das adaptações (sem menções clínicas)",
        },
        implementation_tips: {
          type: "array",
          items: { type: "string" },
          description: "Dicas práticas para o professor aplicar em sala",
        },
      },
      required: [
        "version_universal",
        "version_directed",
        "strategies_applied",
        "pedagogical_justification",
        "implementation_tips",
      ],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting — max 20 adaptations per hour
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: rl } = await admin
      .from("rate_limits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3_600_000);
    const windowStart = rl?.window_start ? new Date(rl.window_start) : null;

    if (windowStart && windowStart > hourAgo && (rl?.request_count ?? 0) >= 20) {
      return new Response(
        JSON.stringify({ error: "Limite de 20 adaptações por hora atingido. Tente novamente mais tarde." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newCount = !windowStart || windowStart <= hourAgo ? 1 : (rl?.request_count ?? 0) + 1;
    const newWindow = !windowStart || windowStart <= hourAgo ? now.toISOString() : rl!.window_start;
    await admin.from("rate_limits").upsert({
      user_id: user.id,
      request_count: newCount,
      window_start: newWindow,
    });

    // Parse request body
    const body = await req.json();
    const {
      original_activity,
      activity_type,
      barriers,
      student_id,
      class_id,
    } = body;

    if (!original_activity || typeof original_activity !== "string" || !original_activity.trim()) {
      return new Response(JSON.stringify({ error: "Atividade original é obrigatória." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!barriers || !Array.isArray(barriers) || barriers.length === 0) {
      return new Response(JSON.stringify({ error: "Selecione pelo menos uma barreira observável." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitizedActivity = sanitize(original_activity, 10000);
    const sanitizedType = activity_type ? sanitize(activity_type, 100) : "atividade";

    // Build barriers description
    const barriersDescription = barriers
      .map((b: { dimension: string; barrier_key: string; notes?: string }) => {
        const note = b.notes ? ` (obs: ${sanitize(b.notes, 200)})` : "";
        return `- [${sanitize(b.dimension, 50)}] ${sanitize(b.barrier_key, 200)}${note}`;
      })
      .join("\n");

    const userPrompt = `TIPO DE ATIVIDADE: ${sanitizedType}

ATIVIDADE ORIGINAL:
${sanitizedActivity}

BARREIRAS OBSERVÁVEIS DO ALUNO:
${barriersDescription}

Adapte esta atividade considerando as barreiras listadas. Lembre-se: foque em remover barreiras pedagógicas, sem fazer diagnóstico clínico. Preserve os objetivos de aprendizagem originais.`;

    // Call AI
    const modelName = "google/gemini-2.5-flash";
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [ADAPTATION_TOOL],
        tool_choice: { type: "function", function: { name: "deliver_adaptation" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições IA atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ error: "Falha na geração da adaptação." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const tokensUsed = aiData.usage?.total_tokens ?? null;

    let adaptationResult: Record<string, any> = {};
    if (toolCall?.function?.arguments) {
      try {
        adaptationResult = JSON.parse(toolCall.function.arguments);
      } catch {
        return new Response(JSON.stringify({ error: "Resposta da IA em formato inválido." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Validate required fields in adaptation
    const requiredFields = [
      "version_universal",
      "version_directed",
      "strategies_applied",
      "pedagogical_justification",
      "implementation_tips",
    ];
    for (const field of requiredFields) {
      if (!adaptationResult[field]) {
        return new Response(JSON.stringify({ error: `Resposta da IA incompleta: campo '${field}' ausente.` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Save to adaptations_history
    const { error: insertError } = await admin.from("adaptations_history").insert({
      teacher_id: user.id,
      student_id: student_id || null,
      class_id: class_id || null,
      original_activity: sanitizedActivity,
      activity_type: sanitizedType,
      barriers_used: barriers,
      adaptation_result: adaptationResult,
      model_used: modelName,
      tokens_used: tokensUsed,
    });

    if (insertError) {
      console.error("Failed to save adaptation history:", insertError);
      // Don't fail the request — still return the adaptation
    }

    // Register credit usage
    await admin.from("credit_usage").insert({
      user_id: user.id,
      action: "adapt_activity",
      credits_used: 1,
    });

    return new Response(
      JSON.stringify({
        adaptation: adaptationResult,
        model_used: modelName,
        tokens_used: tokensUsed,
        disclaimer: "Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("adapt-activity error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

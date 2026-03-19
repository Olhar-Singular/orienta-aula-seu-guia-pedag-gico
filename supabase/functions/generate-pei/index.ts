import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é ISA (Inteligência de Suporte à Aprendizagem), especialista em pedagogia inclusiva e Planos Educacionais Individualizados (PEI).

Sua missão é gerar um PEI completo baseado no contexto fornecido sobre o aluno — barreiras observadas, observações do professor, e histórico de adaptações.

REGRAS INVIOLÁVEIS:
1. NUNCA faça diagnóstico clínico — não mencione TDAH, TEA, dislexia ou qualquer CID/DSM
2. Foque em BARREIRAS OBSERVÁVEIS, não em condições médicas
3. Use linguagem PEDAGÓGICA, nunca clínica
4. Metas devem ser específicas, mensuráveis e com prazo definido
5. Estratégias devem ser aplicáveis em sala de aula regular

Gere o PEI preenchendo TODOS os campos solicitados com conteúdo detalhado e prático.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Não autorizado");

    const { student_id } = await req.json();
    if (!student_id) throw new Error("student_id obrigatório");

    // Fetch student data using userClient (RLS-scoped) to prevent IDOR
    const { data: student, error: studentErr } = await userClient
      .from("class_students")
      .select("*")
      .eq("id", student_id)
      .single();
    if (studentErr || !student) throw new Error("Aluno não encontrado ou sem permissão");

    // Fetch barriers via userClient (RLS enforces ownership)
    const { data: barriers } = await userClient.from("student_barriers").select("*").eq("student_id", student_id).eq("is_active", true);

    // Fetch recent adaptations via userClient
    const { data: history } = await userClient
      .from("adaptations_history")
      .select("original_activity, barriers_used, adaptation_result, created_at")
      .eq("student_id", student_id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Build context
    const barrierList = (barriers || []).map((b: any) => `- ${b.dimension}: ${b.barrier_key}`).join("\n");
    const historyList = (history || []).map((h: any) => `- ${h.original_activity?.slice(0, 100)}`).join("\n");

    const userPrompt = `Gere um PEI completo para o seguinte aluno:

NOME: ${student.name}
${student.notes ? `OBSERVAÇÕES DO PROFESSOR: ${student.notes}` : ""}

BARREIRAS OBSERVADAS:
${barrierList || "Nenhuma barreira registrada ainda."}

HISTÓRICO DE ADAPTAÇÕES RECENTES:
${historyList || "Nenhuma adaptação realizada ainda."}

${!barrierList && !historyList ? "IMPORTANTE: Como não há barreiras ou histórico registrado, gere um PEI genérico inicial que o professor possa personalizar." : ""}

Preencha os campos usando a função fornecida.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_pei",
              description: "Gera um PEI completo com todos os campos preenchidos.",
              parameters: {
                type: "object",
                properties: {
                  student_profile: {
                    type: "string",
                    description: "Perfil do aluno: habilidades, dificuldades, interesses e estilo de aprendizagem",
                  },
                  goals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        area: { type: "string", description: "Área da meta (ex: Comunicação, Autonomia, Socialização)" },
                        description: { type: "string", description: "Descrição específica e mensurável da meta" },
                        deadline: { type: "string", description: "Prazo (ex: 1º semestre, 3 meses)" },
                      },
                      required: ["area", "description", "deadline"],
                    },
                  },
                  curricular_adaptations: {
                    type: "string",
                    description: "Modificações no conteúdo, forma de ensinar ou avaliar",
                  },
                  resources_and_support: {
                    type: "string",
                    description: "Profissionais, tecnologias assistivas, participação da família",
                  },
                  pedagogical_strategies: {
                    type: "string",
                    description: "Estratégias pedagógicas específicas que funcionam para este aluno",
                  },
                  review_schedule: {
                    type: "string",
                    description: "Como e quando o plano será avaliado e atualizado",
                  },
                },
                required: ["student_profile", "goals", "curricular_adaptations", "resources_and_support", "pedagogical_strategies", "review_schedule"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_pei" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      throw new Error("Erro ao gerar PEI com IA");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let peiResult: Record<string, any> = {};
    if (toolCall?.function?.arguments) {
      try {
        peiResult = JSON.parse(toolCall.function.arguments);
      } catch {
        throw new Error("Resposta da IA em formato inválido.");
      }
    }

    // Add IDs to goals
    if (Array.isArray(peiResult.goals)) {
      peiResult.goals = peiResult.goals.map((g: any) => ({
        ...g,
        id: crypto.randomUUID(),
        status: "pendente",
      }));
    }

    // Deduct credit server-side
    await deductCredit(admin, user.id, "generate-pei");

    return new Response(JSON.stringify(peiResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-pei error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

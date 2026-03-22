import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitize } from "../_shared/sanitize.ts";
import { logAiUsage } from "../_shared/logAiUsage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Catálogo de estratégias por perfil de neurodivergência ───
const NEURODIVERGENCE_STRATEGIES: Record<string, string> = {
  tea: `TEA: Roteiros estruturados, linguagem objetiva, esquemas visuais passo a passo`,
  tdah: `TDAH: Etapas menores, marcadores de progresso, feedback frequente, uma instrução por vez`,
  dislexia: `Dislexia: Enunciados curtos e claros, palavras-chave destacadas, apoio visual`,
  discalculia: `Discalculia: Material concreto, exemplos resolvidos, representações visuais`,
  sindrome_down: `Síndrome de Down: Materiais visuais, linguagem simples, instruções passo a passo`,
  altas_habilidades: `Altas Habilidades: Desafios extras, maior complexidade, projetos investigativos`,
  tod: `TOD: Escolhas controladas, propósito claro, autonomia`,
  disgrafia: `Disgrafia: Alternativas à escrita, templates estruturados`,
  tourette: `Tourette: Pausas flexíveis, instruções segmentadas`,
  dispraxia: `Dispraxia: Reduzir escrita manual, alternativas orais/digitais`,
  toc: `TOC: Rubricas objetivas, estrutura previsível`,
};

function getStrategiesForBarriers(barriers: Array<{ dimension?: string }>): string {
  const profiles = new Set<string>();
  for (const b of barriers) {
    if (b.dimension && NEURODIVERGENCE_STRATEGIES[b.dimension]) {
      profiles.add(b.dimension);
    }
  }
  if (profiles.size === 0) return "";
  return Array.from(profiles)
    .map(p => NEURODIVERGENCE_STRATEGIES[p])
    .join("\n");
}

const QUESTION_SCHEMA = {
  type: "object",
  properties: {
    number: { type: "integer" },
    type: {
      type: "string",
      enum: ["multiple_choice", "open_ended", "fill_blank", "true_false"],
    },
    statement: { type: "string", description: "Enunciado da questão (pode conter LaTeX com $...$)" },
    instruction: { type: "string", description: "Instrução opcional antes da questão" },
    alternatives: {
      type: "array",
      items: {
        type: "object",
        properties: {
          letter: { type: "string" },
          text: { type: "string" },
        },
        required: ["letter", "text"],
      },
    },
    scaffolding: {
      type: "array",
      items: { type: "string" },
      description: "Passos de apoio DUA para o aluno",
    },
  },
  required: ["number", "type", "statement"],
};

const REGENERATE_TOOL = {
  type: "function" as const,
  function: {
    name: "deliver_question",
    description: "Entrega a questão regenerada em formato JSON estruturado",
    parameters: {
      type: "object",
      properties: {
        question: {
          ...QUESTION_SCHEMA,
          description: "A questão regenerada",
        },
        changes_made: {
          type: "array",
          items: { type: "string" },
          description: "Lista das mudanças realizadas na questão",
        },
      },
      required: ["question", "changes_made"],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      question,
      version_type,
      activity_type,
      barriers,
      student_id,
      school_id,
      hint,
    } = body;

    if (!question || !version_type || !activity_type || !barriers) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios ausentes." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context for student if provided
    let studentContext = "";
    if (student_id) {
      const { data: studentData } = await userClient
        .from("class_students")
        .select("name, notes")
        .eq("id", student_id)
        .single();

      if (studentData) {
        if (studentData.name) studentContext += `Aluno: ${studentData.name}\n`;
        if (studentData.notes) studentContext += `Observações: ${studentData.notes}\n`;
      }

      // Fetch PEI summary
      const { data: peiData } = await userClient
        .from("student_pei")
        .select("student_profile, pedagogical_strategies")
        .eq("student_id", student_id)
        .maybeSingle();

      if (peiData) {
        if (peiData.student_profile) {
          studentContext += `Perfil PEI: ${peiData.student_profile.substring(0, 500)}\n`;
        }
        if (peiData.pedagogical_strategies) {
          studentContext += `Estratégias PEI: ${peiData.pedagogical_strategies.substring(0, 300)}\n`;
        }
      }
    }

    const activeBarriersList = barriers
      .filter((b: any) => b.is_active !== false)
      .map((b: any) => b.barrier_key || b.label)
      .join(", ");

    const strategies = getStrategiesForBarriers(barriers);

    const versionLabel = version_type === "universal"
      ? "VERSÃO UNIVERSAL (Design Universal para Aprendizagem)"
      : "VERSÃO DIRECIONADA (adaptada ao perfil específico do aluno)";

    const systemPrompt = `Você é ISA (Inteligência de Suporte à Aprendizagem), especialista em pedagogia inclusiva.

Você está REGENERANDO UMA ÚNICA QUESTÃO de uma atividade adaptada.

REGRAS:
1. MANTENHA o número da questão: ${question.number}
2. MANTENHA o tipo (${question.type}) a menos que claramente inadequado
3. PRESERVE o nível cognitivo (Taxonomia de Bloom)
4. PRESERVE o conteúdo/objetivo pedagógico
5. MELHORE clareza, scaffolding e adequação às barreiras
6. Para VERSÃO UNIVERSAL: aplique princípios DUA para todos os alunos
7. Para VERSÃO DIRECIONADA: personalize fortemente para o perfil do aluno

${strategies ? `ESTRATÉGIAS PARA O PERFIL:\n${strategies}` : ""}

REGRAS DE FORMATAÇÃO:
- FRAÇÕES: use $\\frac{a}{b}$
- Notação escolar: v₀, v², Δv
- NUNCA use asteriscos (**) ou markdown

IMPORTANTE: Use a ferramenta deliver_question para retornar a questão regenerada.`;

    let userPrompt = `REGENERAR QUESTÃO ${question.number} - ${versionLabel}

TIPO DE ATIVIDADE: ${activity_type}
BARREIRAS DO ALUNO: ${activeBarriersList}

${studentContext ? `CONTEXTO DO ALUNO:\n${studentContext}` : ""}

QUESTÃO ATUAL:
${JSON.stringify(question, null, 2)}

${hint ? `SUGESTÃO DO PROFESSOR: ${hint}` : ""}

Regenere esta questão melhorando clareza, scaffolding e adequação às barreiras. Mantenha o conteúdo e nível cognitivo.`;

    // Use flash model for faster single-question regeneration
    const modelName = "google/gemini-2.5-flash";
    const aiStartTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    const aiResponse = await fetch("https://api.openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://olharsingular.com.br",
        "X-Title": "Olhar Singular - Regenerar Questão",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [REGENERATE_TOOL],
        tool_choice: { type: "function", function: { name: "deliver_question" } },
        max_tokens: 2000,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const aiDuration = Date.now() - aiStartTime;

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", errText);
      return new Response(JSON.stringify({ error: "Erro na IA.", details: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();

    // Log AI usage
    const inputTokens = aiData.usage?.prompt_tokens || 0;
    const outputTokens = aiData.usage?.completion_tokens || 0;
    await logAiUsage(admin, {
      user_id: user.id,
      feature: "regenerate-question",
      model: modelName,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      duration_ms: aiDuration,
      school_id: school_id || null,
    });

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "deliver_question") {
      return new Response(JSON.stringify({ error: "Resposta da IA em formato inesperado." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Erro ao parsear resposta da IA." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      question: parsed.question,
      changes_made: parsed.changes_made || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

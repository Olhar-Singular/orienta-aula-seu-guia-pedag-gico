import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DIMENSIONS = [
  "processamento",
  "atencao",
  "ritmo",
  "engajamento",
  "expressao",
];

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { activity_text } = await req.json();
    if (!activity_text || typeof activity_text !== "string" || activity_text.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Texto da atividade muito curto." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um especialista em educação inclusiva e Design Universal para Aprendizagem (DUA).
Analise a atividade escolar fornecida e identifique barreiras pedagógicas potenciais nas 5 dimensões:
- processamento: compreensão de enunciados, conceitos abstratos, sequências
- atencao: foco, estímulos, interrupções
- ritmo: tempo necessário, prazos, velocidade
- engajamento: motivação, interesse, participação
- expressao: formas de resposta, escrita, organização

Para cada barreira encontrada, classifique a severidade (alta/media/baixa) e sugira uma mitigação concreta.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Analise esta atividade escolar e identifique todas as barreiras pedagógicas:\n\n${activity_text.slice(0, 4000)}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "report_barriers",
                description:
                  "Retorna as barreiras pedagógicas detectadas na atividade.",
                parameters: {
                  type: "object",
                  properties: {
                    barriers: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          dimension: {
                            type: "string",
                            enum: DIMENSIONS,
                          },
                          barrier_key: { type: "string" },
                          label: { type: "string" },
                          severity: {
                            type: "string",
                            enum: ["alta", "media", "baixa"],
                          },
                          mitigation: { type: "string" },
                        },
                        required: [
                          "dimension",
                          "barrier_key",
                          "label",
                          "severity",
                          "mitigation",
                        ],
                        additionalProperties: false,
                      },
                    },
                    summary: { type: "string" },
                  },
                  required: ["barriers", "summary"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "report_barriers" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Erro ao analisar atividade." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "IA não retornou resultado estruturado." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-barriers error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

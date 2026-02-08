import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o assistente pedagógico do Orienta Aula.

REGRAS ABSOLUTAS:
- Você NÃO realiza diagnóstico.
- Você NÃO interpreta laudos clínicos.
- Você NÃO atua como ferramenta de saúde.
- Você NÃO avalia alunos nem professores.
- Você trabalha exclusivamente com barreiras pedagógicas observáveis.
- Use SEMPRE linguagem pedagógica, clara e não clínica.
- Nunca prometa melhora de aprendizagem ou resultados clínicos.
- Sempre reforce a autonomia do usuário.
- A decisão final é SEMPRE do profissional.

REGRA ABSOLUTA DE NOTAÇÃO MATEMÁTICA:
- É TERMINANTEMENTE PROIBIDO usar LaTeX, MathJax ou notações com: $, {}, \\, ^, _.
- NÃO usar: $v_{0}$, v^2, m/s^2.
- USAR SEMPRE notação escolar simples (Unicode): v₀, v², m/s², Δv, · (ponto médio), − (sinal de menos correto).
- Se detectar LaTeX no texto, converter automaticamente para notação escolar simples.

REGRAS PARA MATEMÁTICA E FÍSICA:
1) Preservar integralmente fórmulas, símbolos e unidades.
2) NÃO transformar fórmulas em texto discursivo.
3) NÃO simplificar fórmulas.
4) Manter unidades corretas: m, s, kg, N, J, m/s, m/s².
5) Corrigir apenas a FORMATAÇÃO visual quando necessário.
6) Nunca quebrar equações no meio de frases.
7) Toda equação deve aparecer em linha isolada, com espaçamento acima e abaixo.

ESCOPO EM PROVAS E AVALIAÇÕES:
- Se a atividade for PROVA ou AVALIAÇÃO:
  • realizar apenas adaptação de acesso;
  • reorganizar, fragmentar e esclarecer instruções;
  • reduzir carga cognitiva simultânea;
  • NÃO reduzir conteúdo conceitual;
  • NÃO alterar objetivo avaliativo;
  • NÃO simplificar fórmulas, conceitos ou nível.

ESCOPO PARA RESUMO:
- Se o tipo de atividade for RESUMO e o modo for "Adaptar atividade existente":
  • Gerar um RESUMO PEDAGÓGICO do texto fornecido.
  • Manter todos os conceitos-chave, definições e informações essenciais.
  • Adaptar a linguagem conforme as barreiras pedagógicas selecionadas.
  • Organizar o resumo com tópicos, subtítulos e destaques visuais.
  • NÃO gerar exercícios ou questões — apenas o resumo do conteúdo.
  • O formato de saída deve ser:
    ## RESUMO ADAPTADO
    (resumo aqui)
    ## ORIENTAÇÕES AO PROFISSIONAL
    (orientações aqui)
    ## JUSTIFICATIVA PEDAGÓGICA
    (justificativa aqui)
    ---
    *A decisão final é sempre do profissional.*

- Se o tipo de atividade for RESUMO e o modo for "Criar atividade do zero":
  • Criar uma ATIVIDADE DE RESUMO onde o aluno deve resumir um texto ou conteúdo.
  • Incluir orientações adaptadas ao perfil do aluno sobre como fazer o resumo.
  • Seguir o formato padrão de ATIVIDADE ADAPTADA.

Ao gerar uma adaptação, SEMPRE responda no formato:

## ATIVIDADE ADAPTADA
(conteúdo adaptado aqui)

## ORIENTAÇÕES AO PROFISSIONAL
(orientações práticas aqui)

## JUSTIFICATIVA PEDAGÓGICA
(justificativa curta aqui)

---
*A decisão final é sempre do profissional. Você pode ajustar ou ignorar qualquer sugestão.*
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemContent = SYSTEM_PROMPT;

    // If generating an adaptation, add context
    if (action === "generate" && context) {
      systemContent += `\n\nCONTEXTO DA ADAPTAÇÃO:
- Modo: ${context.mode === "adaptar" ? "Adaptar atividade existente" : "Criar atividade do zero"}
- Tipo: ${context.type}
- Disciplina: ${context.subject}
- Série/Ano: ${context.grade}
- Assunto: ${context.topic}
- Objetivo pedagógico: ${context.objective}
${context.neurodivergence?.length ? "- Neurodivergência (contexto secundário): " + context.neurodivergence.join(", ") : ""}
${context.difficulty ? "- Nível de dificuldade: " + context.difficulty : ""}
${context.questionCount ? "- Quantidade de questões: " + context.questionCount : ""}
${context.includeExample ? "- Incluir exemplo resolvido: Sim" : ""}
${context.includeAnswer ? "- Incluir gabarito: Sim" : ""}

RESPOSTAS DO QUESTIONÁRIO PEDAGÓGICO:
${context.questionnaireAnswers ? Object.entries(context.questionnaireAnswers).map(([k, v]) => `- ${k}: ${v}`).join("\n") : "Não preenchido"}

CONFIGURAÇÕES DE ADAPTAÇÃO SELECIONADAS:
${context.strategySettings ? (context.strategySettings as string[]).join(", ") : "Nenhuma"}

${context.originalText ? "TEXTO ORIGINAL DA ATIVIDADE:\n" + context.originalText : ""}
${context.notes ? "OBSERVAÇÕES DO PROFESSOR:\n" + context.notes : ""}`;
    }

    console.log("Processing request:", { action, hasContext: !!context, messageCount: messages?.length });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContent },
          ...(messages || []),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na sua conta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao conectar com a IA." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

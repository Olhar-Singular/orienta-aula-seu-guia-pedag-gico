import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAiUsage } from "../_shared/logAiUsage.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o assistente pedagógico do Olhar Singular.

REGRAS ABSOLUTAS:
- Você NÃO realiza diagnóstico.
- Você NÃO interpreta laudos clínicos.
- Você NÃO atua como ferramenta de saúde.
- Você NÃO avalia alunos nem professores.
- Você trabalha com barreiras pedagógicas observáveis conectadas a neurodivergências.
- Use SEMPRE linguagem pedagógica, clara e focada em estratégias.
- Nunca prometa melhora de aprendizagem ou resultados clínicos.
- Sempre reforce a autonomia do usuário.
- A decisão final é SEMPRE do profissional.

REGRA DE NOTAÇÃO MATEMÁTICA:
- Para variáveis e símbolos, use notação escolar Unicode: v₀, v², m/s², Δv, · (ponto médio), − (sinal de menos correto).
- FRAÇÕES: SEMPRE envolva expressões LaTeX com delimitadores de cifrão. Exemplos: $\\frac{a}{b}$, $\\frac{23}{24} = \\frac{?}{48}$, $\\sqrt{2}$
- Cada equação em LINHA SEPARADA.
- NUNCA escreva comandos LaTeX como \\frac ou \\sqrt sem delimitadores $...$.

REGRAS PARA MATEMÁTICA E FÍSICA:
1) Preservar integralmente fórmulas, símbolos e unidades.
2) NÃO transformar fórmulas em texto discursivo.
3) NÃO simplificar fórmulas.
4) Manter unidades corretas: m, s, kg, N, J, m/s, m/s².
5) Corrigir apenas a FORMATAÇÃO visual quando necessário.
6) Nunca quebrar equações no meio de frases.
7) Toda equação deve aparecer em linha isolada, com espaçamento acima e abaixo.

CATÁLOGO DE ESTRATÉGIAS POR NEURODIVERGÊNCIA:

TEA: Roteiros estruturados, linguagem objetiva/direta, esquemas visuais, antecipação, redução de estímulos sensoriais, definição clara de papéis.
TDAH: Etapas menores com checkpoints, tempo estruturado, alternância explicação/prática, cronômetros visuais, feedback frequente.
TOD: Combinados participativos, explicar propósito, evitar confrontos, escolhas controladas, reforço positivo.
Síndrome de Down: Materiais concretos/visuais, repetição com variação, linguagem simples, apoio por pares, mais tempo.
Altas Habilidades: Problemas desafiadores, projetos investigativos, ampliação curricular, níveis cognitivos superiores.
Dislexia: Enunciados curtos/claros, leitura compartilhada, recursos visuais, fontes maiores, avaliação oral.
Discalculia: Material concreto, representações visuais, múltiplas formas de resolução, exemplos resolvidos, calculadora quando pertinente.
Disgrafia: Respostas digitadas/orais, avaliar raciocínio, templates, tecnologia assistiva, espaços amplos.
Tourette: Pausas flexíveis, ambiente acolhedor, avaliação focada no conteúdo, tempo adicional.
Dispraxia: Reduzir escrita manual, templates prontos, alternativas à escrita, materiais adaptados.
TOC: Rubricas objetivas, limitar opções, estrutura previsível, tempo flexível, validação parcial.

PRINCÍPIOS GERAIS:
- Trabalhar múltiplas representações (visual, simbólica, concreta)
- Avaliar processo e raciocínio, não apenas resultado
- Oferecer diferentes formas de demonstrar aprendizagem
- Antecipar etapas da atividade
- Diversificar avaliação

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
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sbClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: authData, error: authError } = await sbClient.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting — max 20 requests per hour
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: rl } = await admin.from("rate_limits").select("*").eq("user_id", authData.user.id).single();
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3_600_000);
    const windowStart = rl?.window_start ? new Date(rl.window_start) : null;
    if (windowStart && windowStart > hourAgo && (rl?.request_count ?? 0) >= 20) {
      return new Response(JSON.stringify({ error: "Limite de 20 adaptações por hora atingido. Tente novamente mais tarde." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const newCount = !windowStart || windowStart <= hourAgo ? 1 : (rl?.request_count ?? 0) + 1;
    const newWindow = !windowStart || windowStart <= hourAgo ? now.toISOString() : rl!.window_start;
    await admin.from("rate_limits").upsert({ user_id: authData.user.id, request_count: newCount, window_start: newWindow });


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
        model: "google/gemini-2.5-pro",
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

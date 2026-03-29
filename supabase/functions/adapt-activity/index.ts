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
  tea: `TEA (Transtorno do Espectro Autista):
Barreiras: Abstração excessiva, comunicação social, sobrecarga sensorial, mudanças inesperadas
Adaptações Teóricas:
- Roteiros estruturados e previsíveis
- Antecipação da aula e dos critérios de avaliação
- Linguagem objetiva e direta, sem ambiguidades ou figuras de linguagem
- Uso de esquemas visuais e passo a passo
Adaptações Práticas:
- Organização clara das etapas da prática
- Redução de estímulos sensoriais excessivos (layout limpo, sem poluição visual)
- Definição clara de papéis em trabalhos em grupo`,

  tdah: `TDAH:
Barreiras: Atenção sustentada, impulsividade, organização
Adaptações Teóricas:
- Dividir atividades longas em etapas menores com checkpoints
- Uso de tempo estruturado (blocos curtos com pausas)
- Alternância entre explicação e resolução prática
- Marcadores visuais de progresso
Adaptações Práticas:
- Atividades dinâmicas e com movimento
- Uso de cronômetros visuais
- Feedback frequente e imediato
- Instruções uma de cada vez (não múltiplas simultâneas)`,

  tod: `TOD (Transtorno Opositivo-Desafiador):
Barreiras: Resistência a regras, conflitos com autoridade
Adaptações Teóricas:
- Estabelecer combinados claros e participativos
- Explicar o propósito das atividades (por que estamos fazendo isso)
- Evitar confrontos públicos
- Oferecer autonomia controlada
Adaptações Práticas:
- Oferecer escolhas controladas (ex: qual problema resolver primeiro)
- Reforçar comportamentos colaborativos
- Valorizar contribuições positivas do aluno`,

  sindrome_down: `Síndrome de Down:
Barreiras: Ritmo de aprendizagem mais lento, memória de curto prazo, abstração
Adaptações Teóricas:
- Uso de materiais concretos e visuais
- Repetição com variação de estratégias
- Linguagem simples e objetiva
- Enunciados curtos e diretos
Adaptações Práticas:
- Atividades manipulativas
- Apoio por pares (aprendizagem colaborativa)
- Mais tempo para execução
- Instruções visuais passo a passo`,

  altas_habilidades: `Altas Habilidades / Superdotação:
Barreiras: Desmotivação por falta de desafio, tédio
Adaptações Teóricas:
- Problemas desafiadores e situações-problema ampliadas
- Projetos investigativos com autonomia
- Ampliação curricular (ir além do conteúdo básico)
- Questões que exigem níveis cognitivos superiores (análise, síntese, criação)
Adaptações Práticas:
- Liderança em projetos
- Propostas de resolução alternativa
- Atividades com maior complexidade e profundidade`,

  dislexia: `Dislexia:
Barreiras: Leitura e interpretação de enunciados
Adaptações Teóricas:
- Enunciados claros, curtos e objetivos
- Leitura compartilhada (indicação para o professor ler junto)
- Uso de recursos visuais e esquemas
- Fontes maiores e espaçamento generoso
Adaptações Práticas:
- Avaliação oral quando pertinente
- Apoio na interpretação do problema antes da execução
- Destacar palavras-chave nos enunciados`,

  discalculia: `Discalculia:
Barreiras: Conceitos numéricos e operações
Adaptações Teóricas:
- Uso de material concreto (representações visuais: diagramas, gráficos, tabelas)
- Explorar diferentes formas de resolução
- Exemplos resolvidos passo a passo antes do exercício
- Fórmulas destacadas e referenciadas
Adaptações Práticas:
- Simulações práticas com contexto real
- Uso de calculadora quando o foco não for o cálculo em si
- Representações visuais de conceitos numéricos`,

  disgrafia: `Disgrafia:
Barreiras: Escrita manual e organização espacial
Adaptações Teóricas:
- Permitir respostas digitadas ou orais
- Avaliar pelo raciocínio, não pela caligrafia
- Modelos estruturados de resolução (templates)
Adaptações Práticas:
- Uso de tecnologia assistiva
- Foco na resolução oral ou demonstrativa
- Espaços amplos para escrita`,

  tourette: `Síndrome de Tourette:
Barreiras: Tiques motores ou vocais involuntários, dificuldade de atenção
Adaptações Teóricas:
- Ambiente acolhedor sem chamar atenção para os tiques
- Pausas flexíveis durante atividades
- Instruções claras e segmentadas
Adaptações Práticas:
- Permitir movimentação controlada
- Avaliação focada no conteúdo, não na forma
- Tempo adicional quando necessário`,

  dispraxia: `Dispraxia:
Barreiras: Coordenação motora e planejamento motor
Adaptações Teóricas:
- Reduzir exigência de escrita manual extensa
- Templates e organizadores prontos
- Instruções visuais sequenciais
Adaptações Práticas:
- Alternativas à escrita (oral, digital, múltipla escolha)
- Materiais adaptados (folhas com linhas maiores, espaçamento)
- Tempo adicional para tarefas motoras`,

  toc: `TOC (Transtorno Obsessivo-Compulsivo):
Barreiras: Rituais compulsivos, perfeccionismo excessivo
Adaptações Teóricas:
- Definir claramente o "bom o suficiente" (rubricas objetivas)
- Limitar opções para reduzir ansiedade de decisão
- Estrutura previsível e consistente
Adaptações Práticas:
- Tempo flexível sem pressão
- Validação parcial do progresso
- Evitar atividades que exijam perfeição visual`,
};

// ─── Extrair perfis relevantes a partir das dimensões das barreiras ───
function getRelevantProfiles(barriers: Array<{ dimension?: string; barrier_key?: string }>): string[] {
  const profiles = new Set<string>();

  for (const b of barriers) {
    // dimension already maps to the neurodivergence key (tea, tdah, etc.)
    if (b.dimension && NEURODIVERGENCE_STRATEGIES[b.dimension]) {
      profiles.add(b.dimension);
    }
  }

  // Fallback: if no mapping found, include the 3 most common
  if (profiles.size === 0) {
    return ["tdah", "tea", "dislexia"];
  }

  return Array.from(profiles);
}

// ─── Construir system prompt dinâmico (só perfis relevantes) ───
function buildSystemPrompt(barriers: Array<{ dimension?: string; barrier_key?: string }>): string {
  const relevantProfiles = getRelevantProfiles(barriers);

  const strategies = relevantProfiles
    .map(profile => NEURODIVERGENCE_STRATEGIES[profile])
    .filter(Boolean)
    .join("\n\n");

  return `Você é ISA (Inteligência de Suporte à Aprendizagem), uma especialista sênior em pedagogia inclusiva com formação em Design Universal para Aprendizagem (DUA/UDL), diferenciação curricular e acessibilidade educacional.

METODOLOGIA DE INTEGRAÇÃO DE CONTEXTO
Antes de gerar qualquer adaptação, você DEVE integrar todos os pilares disponíveis:

PILAR 1 — BARREIRAS IDENTIFICADAS
- Use as barreiras observáveis informadas pelo professor
- Consulte as barreiras cadastradas no perfil do aluno
- Considere o histórico de adaptações anteriores

PILAR 2 — DOCUMENTOS DE REFERÊNCIA
- Se o PEI estiver disponível, siga suas diretrizes
- Se houver laudos ou relatórios mencionados, considere-os
- Respeite as orientações de profissionais especializados

PILAR 3 — CONTEXTO DA AVALIAÇÃO
- Analise o conteúdo cobrado e os objetivos pedagógicos
- Preserve o nível cognitivo (Taxonomia de Bloom)
- Mantenha equivalência avaliativa entre versões

MISSÃO
Adaptar atividades escolares para REMOVER BARREIRAS à aprendizagem, preservando rigorosamente os objetivos pedagógicos e o nível cognitivo original.

TRAVAS DE SEGURANÇA (INVIOLÁVEIS)
1. SEMPRE preserve os objetivos de aprendizagem e o nível cognitivo da atividade original
2. Foque em BARREIRAS OBSERVÁVEIS em sala, conectadas ao perfil de neurodivergência do aluno
3. Use linguagem PEDAGÓGICA com foco em estratégias práticas
4. Toda adaptação deve ser aplicável em sala de aula regular sem recursos especializados
5. NÃO reduza a complexidade conceitual — reduza as barreiras de ACESSO ao conteúdo
6. A decisão final é sempre do profissional

FRAMEWORK DUA — 3 PRINCÍPIOS
Aplique sistematicamente os 3 princípios do Design Universal para Aprendizagem:

PRINCÍPIO 1 — MÚLTIPLAS FORMAS DE REPRESENTAÇÃO (O "quê" da aprendizagem)
- Ofereça alternativas perceptuais: reformule enunciados, destaque palavras-chave, separe informações visuais de textuais
- Clarifique vocabulário e símbolos: inclua dicas contextuais, glossários breves, exemplos concretos
- Apoie a compreensão: ative conhecimentos prévios, destaque padrões e relações, guie o processamento de informação

PRINCÍPIO 2 — MÚLTIPLAS FORMAS DE AÇÃO E EXPRESSÃO (O "como" da aprendizagem)
- Varie os meios de resposta: permita alternativas à escrita longa (oral, esquemas, múltipla escolha, completar lacunas)
- Apoie o planejamento: forneça checklists, divida tarefas em etapas, ofereça organizadores gráficos
- Apoie a fluência: forneça modelos/exemplos resolvidos, scaffolding gradual

PRINCÍPIO 3 — MÚLTIPLAS FORMAS DE ENGAJAMENTO (O "porquê" da aprendizagem)
- Recrute interesse: conecte com cotidiano do aluno, ofereça escolhas, varie formatos
- Sustente esforço: quebre em metas menores, forneça feedback imediato, use marcos de progresso
- Apoie autorregulação: inclua rubricas de autoavaliação, prompts de reflexão

ESTRATÉGIAS PARA O PERFIL DESTE ALUNO
${strategies}

PRINCÍPIOS GERAIS DE ADAPTAÇÃO EM EXATAS
- Trabalhar múltiplas representações (visual, simbólica, concreta)
- Avaliar processo e raciocínio, não apenas o resultado
- Oferecer diferentes formas de demonstrar aprendizagem
- Antecipar etapas da atividade
- Diversificar avaliação

ADAPTAÇÃO POR TIPO DE ATIVIDADE
PROVA:
- Mantenha o rigor avaliativo; adapte o FORMATO, não o CONTEÚDO conceitual
- Preserve o mesmo número de questões ou justifique a redução
- Garanta equivalência avaliativa entre versão universal e direcionada

EXERCÍCIO:
- Pode incluir scaffolding mais intenso (dicas, exemplos parciais)
- Pode adicionar questões preparatórias que construam o raciocínio gradualmente
- Permita maior flexibilidade no formato de resposta

ATIVIDADE DE CASA:
- Considere que o aluno não terá mediação do professor
- Inclua instruções mais detalhadas e autoexplicativas
- Sugira recursos de apoio (vídeos, materiais complementares)

TRABALHO:
- Divida em etapas com entregas parciais
- Forneça rubrica clara de avaliação
- Ofereça templates e organizadores para estruturar o trabalho

TAXONOMIA DE BLOOM — PRESERVAÇÃO
Identifique o nível cognitivo de cada questão e PRESERVE-O na adaptação:
- Lembrar → mantenha como lembrar
- Compreender → mantenha como compreender
- Aplicar → mantenha como aplicar
- Analisar → mantenha como analisar
- Avaliar → mantenha como avaliar
- Criar → mantenha como criar
A adaptação remove BARREIRAS DE ACESSO, não reduz o nível cognitivo.

REGRAS DE FORMATAÇÃO
1. FRAÇÕES: SEMPRE envolva expressões LaTeX com delimitadores de cifrão. Exemplos: $\\frac{a}{b}$, $\\frac{23}{24} = \\frac{?}{48}$, $\\sqrt{2}$
2. Notação escolar Unicode para variáveis: v₀, v², Δv
3. Preserve fórmulas, símbolos e unidades integralmente
4. NUNCA use asteriscos (**) ou markdown.
5. NUNCA escreva comandos LaTeX como \\frac ou \\sqrt sem delimitadores $...$. Sempre use $...$

IMPORTANTE: Você DEVE responder usando a ferramenta deliver_adaptation com dados JSON estruturados.
Cada questão deve ser um objeto com number, type, statement e alternatives (se múltipla escolha).
Tipos válidos: multiple_choice, open_ended, fill_blank, true_false.

EXEMPLO DE RESPOSTA ESTRUTURADA:
{
  "version_universal": {
    "sections": [
      {
        "title": "Frações",
        "questions": [
          {
            "number": 1,
            "type": "multiple_choice",
            "statement": "Qual fração representa metade?",
            "instruction": "Observe e escolha a alternativa correta.",
            "alternatives": [
              { "letter": "a", "text": "$\\\\frac{1}{2}$" },
              { "letter": "b", "text": "$\\\\frac{1}{4}$" },
              { "letter": "c", "text": "$\\\\frac{3}{4}$" }
            ],
            "scaffolding": ["Pense: quantas partes iguais tem o todo?"]
          },
          {
            "number": 2,
            "type": "open_ended",
            "statement": "Explique com suas palavras o que é uma fração."
          }
        ]
      }
    ]
  }
}`;
}

const ACTIVITY_SCHEMA = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          introduction: { type: "string" },
          questions: {
            type: "array",
            items: {
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
            },
          },
        },
        required: ["questions"],
      },
    },
    general_instructions: { type: "string" },
  },
  required: ["sections"],
};

const ADAPTATION_TOOL = {
  type: "function" as const,
  function: {
    name: "deliver_adaptation",
    description: "Entrega a atividade adaptada em formato JSON estruturado com questões tipadas",
    parameters: {
      type: "object",
      properties: {
        version_universal: {
          ...ACTIVITY_SCHEMA,
          description: "Versão universal (DUA) da atividade adaptada",
        },
        version_directed: {
          ...ACTIVITY_SCHEMA,
          description: "Versão direcionada ao perfil específico do aluno",
        },
        strategies_applied: {
          type: "array",
          items: { type: "string" },
          description: "Lista de estratégias pedagógicas aplicadas",
        },
        pedagogical_justification: {
          type: "string",
          description: "Justificativa pedagógica curta das adaptações realizadas",
        },
        implementation_tips: {
          type: "array",
          items: { type: "string" },
          description: "Dicas práticas de implementação para o professor",
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
      original_activity,
      activity_type,
      barriers,
      student_id,
      class_id,
      observation_notes,
      school_id,
      question_images,
    } = body;

    if (!original_activity || !activity_type || !barriers) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios ausentes." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitizedActivity = sanitize(original_activity, 15000);
    const sanitizedType = sanitize(activity_type, 100);
    const sanitizedObservations = observation_notes ? sanitize(observation_notes, 2000) : "";

    // Build enriched context — use userClient (RLS-scoped) to prevent IDOR
    let studentContext = "";
    let studentName = "";
    if (student_id) {
      // Verify caller has access to this student via RLS
      const { data: studentData, error: studentErr } = await userClient
        .from("class_students")
        .select("name, notes")
        .eq("id", student_id)
        .single();

      if (studentErr || !studentData) {
        return new Response(JSON.stringify({ error: "Aluno não encontrado ou sem permissão." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      studentName = studentData.name || "";

      // Fetch barriers via userClient (RLS enforces ownership through class join)
      const { data: studentBarriers } = await userClient
        .from("student_barriers")
        .select("barrier_key, dimension, notes")
        .eq("student_id", student_id)
        .eq("is_active", true);

      // Fetch recent adaptations via userClient
      const { data: recentAdaptations } = await userClient
        .from("adaptations_history")
        .select("activity_type, barriers_used, created_at")
        .eq("student_id", student_id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (studentData.name) {
        studentContext += `\nNome do aluno: ${studentData.name}`;
      }
      if (studentData.notes) {
        studentContext += `\nObservações fixas do perfil do aluno: ${studentData.notes}`;
      }
      if (studentBarriers && studentBarriers.length > 0) {
        studentContext += `\nBarreiras registradas no perfil: ${studentBarriers.map((b: any) => `${b.barrier_key}${b.notes ? ` (${b.notes})` : ""}`).join(", ")}`;
      }
      if (recentAdaptations && recentAdaptations.length > 0) {
        studentContext += `\nÚltimas ${recentAdaptations.length} adaptações realizadas para este aluno (contexto de continuidade).`;
      }
    }

    // ─── PILAR 2: PEI do aluno ───
    let peiContext = "";
    if (student_id) {
      const { data: peiData } = await userClient
        .from("student_pei")
        .select("student_profile, goals, curricular_adaptations, pedagogical_strategies, resources_and_support, review_schedule, additional_notes")
        .eq("student_id", student_id)
        .maybeSingle();

      if (peiData) {
        const peiParts: string[] = [];
        if (peiData.student_profile) peiParts.push(`PERFIL: ${peiData.student_profile}`);
        if (peiData.goals) peiParts.push(`METAS: ${JSON.stringify(peiData.goals)}`);
        if (peiData.curricular_adaptations) peiParts.push(`ADAPTAÇÕES CURRICULARES: ${peiData.curricular_adaptations}`);
        if (peiData.pedagogical_strategies) peiParts.push(`ESTRATÉGIAS: ${peiData.pedagogical_strategies}`);
        if (peiData.resources_and_support) peiParts.push(`RECURSOS: ${peiData.resources_and_support}`);
        if (peiData.review_schedule) peiParts.push(`REVISÃO: ${peiData.review_schedule}`);
        if (peiData.additional_notes) peiParts.push(`NOTAS: ${peiData.additional_notes}`);

        if (peiParts.length > 0) {
          peiContext = `PEI DO ALUNO:\n${peiParts.join("\n")}`;
        }
      }
    }

    // ─── PILAR 2b: Documentos do aluno ───
    let documentsContext = "";
    if (student_id) {
      const { data: studentFiles } = await userClient
        .from("student_files")
        .select("file_name, category, created_at")
        .eq("student_id", student_id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (studentFiles && studentFiles.length > 0) {
        const categorizedFiles = studentFiles.reduce((acc: Record<string, string[]>, file: any) => {
          const cat = file.category || "outros";
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(file.file_name);
          return acc;
        }, {});

        const docParts: string[] = [];
        for (const [category, files] of Object.entries(categorizedFiles)) {
          docParts.push(`${category.toUpperCase()}: ${(files as string[]).join(", ")}`);
        }
        documentsContext = `DOCUMENTOS DO ALUNO:\n${docParts.join("\n")}\nConsidere as informações destes documentos ao adaptar.`;
      }
    }

    // ─── PILAR 4: Histórico de chat relevante (reusa studentName) ───
    let chatContext = "";
    if (student_id && studentName) {
      const { data: conversations } = await userClient
        .from("chat_conversations")
        .select("id, title, updated_at")
        .eq("user_id", user.id)
        .ilike("title", `%${studentName}%`)
        .order("updated_at", { ascending: false })
        .limit(3);

      if (conversations && conversations.length > 0) {
        const chatParts: string[] = [];
        for (const conv of conversations) {
          const { data: messages } = await userClient
            .from("chat_messages")
            .select("role, content")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: true })
            .limit(10);

          if (messages && messages.length > 0) {
            chatParts.push(`--- ${conv.title} ---`);
            messages.forEach((msg: any) => {
              const role = msg.role === "user" ? "Professor" : "ISA";
              const preview = msg.content.substring(0, 300);
              chatParts.push(`[${role}]: ${preview}${msg.content.length > 300 ? "..." : ""}`);
            });
          }
        }
        if (chatParts.length > 0) {
          chatContext = `CONVERSAS ANTERIORES RELEVANTES:\n${chatParts.join("\n")}`;
        }
      }
    }

    // Build the active barriers description
    const activeBarriersList = barriers
      .filter((b: any) => b.is_active !== false)
      .map((b: any) => {
        const parts = [b.barrier_key || b.label];
        if (b.dimension) parts.push(`(dimensão: ${b.dimension})`);
        if (b.notes) parts.push(`— nota: ${b.notes}`);
        return parts.join(" ");
      })
      .join("\n- ");

    // ─── Build clean user prompt ───
    let userPrompt = `TIPO DE ATIVIDADE: ${sanitizedType}

BARREIRAS OBSERVÁVEIS DO ALUNO:
- ${activeBarriersList}`;

    if (sanitizedObservations) {
      userPrompt += `\n\nOBSERVAÇÕES DO PROFESSOR:\n${sanitizedObservations}`;
    }

    if (studentContext) {
      userPrompt += `\n\nCONTEXTO DO ALUNO:${studentContext}`;
    }

    if (peiContext) {
      userPrompt += `\n\n${peiContext}`;
    }

    if (documentsContext) {
      userPrompt += `\n\n${documentsContext}`;
    }

    if (chatContext) {
      userPrompt += `\n\n${chatContext}`;
    }

    userPrompt += `\n\nATIVIDADE ORIGINAL:\n${sanitizedActivity}`;

    if (question_images && Array.isArray(question_images) && question_images.length > 0) {
      userPrompt += `\n\nNOTA: A atividade contém ${question_images.length} imagem(ns). Preserve referências a figuras/imagens nas adaptações.`;
    }

    // ─── Build dynamic system prompt (only relevant profiles) ───
    const SYSTEM_PROMPT_FINAL = buildSystemPrompt(barriers);

    // Call AI — using pro model for complex pedagogical reasoning
    const modelName = "google/gemini-2.5-pro";
    const aiStartTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    let aiResponse: Response;
    let aiData: any;
    let aiDurationMs: number;

    try {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: SYSTEM_PROMPT_FINAL },
            { role: "user", content: userPrompt },
          ],
          tools: [ADAPTATION_TOOL],
          tool_choice: { type: "function", function: { name: "deliver_adaptation" } },
        }),
        signal: controller.signal,
      });
      aiDurationMs = Date.now() - aiStartTime;
    } catch (fetchErr: any) {
      aiDurationMs = Date.now() - aiStartTime;
      const isTimeout = fetchErr?.name === "AbortError";
      logAiUsage({
        user_id: user.id,
        school_id: school_id || undefined,
        action_type: "adaptation",
        model: modelName,
        input_tokens: 0,
        output_tokens: 0,
        prompt_text: userPrompt,
        request_duration_ms: aiDurationMs,
        status: isTimeout ? "timeout" : "error",
        error_message: isTimeout ? "Request timed out after 90s" : (fetchErr?.message || "Network error"),
        metadata: {
          activity_type: sanitizedType,
          barriers_count: barriers?.length || 0,
          has_student: !!student_id,
          has_pei: !!peiContext,
        },
      }).catch(() => {});
      throw new Error(isTimeout ? "A IA demorou demais para responder. Tente novamente." : "Falha na conexão com a IA.");
    } finally {
      clearTimeout(timeoutId);
    }

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      // Log error
      logAiUsage({
        user_id: user.id,
        school_id: school_id || undefined,
        action_type: "adaptation",
        model: modelName,
        input_tokens: 0,
        output_tokens: 0,
        prompt_text: userPrompt,
        request_duration_ms: aiDurationMs,
        status: "error",
        error_message: `HTTP ${aiResponse.status}: ${errText.slice(0, 200)}`,
        metadata: {
          activity_type: sanitizedType,
          barriers_count: barriers?.length || 0,
          has_student: !!student_id,
          http_status: aiResponse.status,
        },
      }).catch(() => {});

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições IA atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ error: "Falha na geração da adaptação." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const tokensUsed = aiData.usage?.total_tokens ?? null;

    // Log AI usage (fire-and-forget)
    logAiUsage({
      user_id: user.id,
      school_id: school_id || undefined,
      action_type: "adaptation",
      model: modelName,
      input_tokens: aiData.usage?.prompt_tokens || 0,
      output_tokens: aiData.usage?.completion_tokens || 0,
      prompt_text: (aiData.usage?.prompt_tokens || 0) === 0 ? userPrompt : undefined,
      response_text: (aiData.usage?.completion_tokens || 0) === 0 ? toolCall?.function?.arguments : undefined,
      request_duration_ms: aiDurationMs,
      status: "success",
      metadata: {
        activity_type: sanitizedType,
        barriers_count: barriers?.length || 0,
        has_student: !!student_id,
        has_pei: !!peiContext,
      },
    }).catch(() => {});

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

    // Include question images in the result so frontend can use them
    const resultWithImages = {
      ...adaptationResult,
      question_images: Array.isArray(question_images) ? question_images : [],
    };

    // NOTE: Save is handled by the frontend (StepExport) to avoid duplicates

    return new Response(
      JSON.stringify({
        adaptation: resultWithImages,
        model_used: modelName,
        tokens_used: tokensUsed,
        context_pillars: {
          hasBarriers: true,
          hasPEI: !!peiContext,
          hasDocuments: !!documentsContext,
          hasChatHistory: !!chatContext,
          hasActivityContext: true,
        },
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitize } from "../_shared/sanitize.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é ISA (Inteligência de Suporte à Aprendizagem), uma especialista sênior em pedagogia inclusiva com formação em Design Universal para Aprendizagem (DUA/UDL), diferenciação curricular e acessibilidade educacional.

═══════════════════════════════════════
METODOLOGIA DE INTEGRAÇÃO DE CONTEXTO
═══════════════════════════════════════
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

PILAR 4 — HISTÓRICO DE INTERAÇÕES
- Se houver conversas anteriores, mantenha consistência
- Evite contradizer orientações já fornecidas
- Aproveite insights de discussões prévias

Só prossiga para a geração da adaptação após cruzar todos os pilares
simultaneamente, produzindo um contexto rico e fundamentado.

═══════════════════════════════════════
MISSÃO
═══════════════════════════════════════
Adaptar atividades escolares para REMOVER BARREIRAS à aprendizagem, preservando rigorosamente os objetivos pedagógicos e o nível cognitivo original (Taxonomia de Bloom revisada).

═══════════════════════════════════════
TRAVAS DE SEGURANÇA (INVIOLÁVEIS)
═══════════════════════════════════════
1. SEMPRE preserve os objetivos de aprendizagem e o nível cognitivo da atividade original
2. Foque em BARREIRAS OBSERVÁVEIS em sala, conectadas ao perfil de neurodivergência do aluno
3. Use linguagem PEDAGÓGICA com foco em estratégias práticas
4. Toda adaptação deve ser aplicável em sala de aula regular sem recursos especializados
5. NÃO reduza a complexidade conceitual — reduza as barreiras de ACESSO ao conteúdo
6. A decisão final é sempre do profissional

═══════════════════════════════════════
FRAMEWORK DUA — 3 PRINCÍPIOS
═══════════════════════════════════════
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

═══════════════════════════════════════
ESTRATÉGIAS POR NEURODIVERGÊNCIA (CATÁLOGO)
═══════════════════════════════════════

TEA (Transtorno do Espectro Autista):
Barreiras: Abstração excessiva, comunicação social, sobrecarga sensorial, mudanças inesperadas
Adaptações Teóricas:
- Roteiros estruturados e previsíveis
- Antecipação da aula e dos critérios de avaliação
- Linguagem objetiva e direta, sem ambiguidades ou figuras de linguagem
- Uso de esquemas visuais e passo a passo
Adaptações Práticas:
- Organização clara das etapas da prática
- Redução de estímulos sensoriais excessivos (layout limpo, sem poluição visual)
- Definição clara de papéis em trabalhos em grupo

TDAH:
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
- Instruções uma de cada vez (não múltiplas simultâneas)

TOD (Transtorno Opositivo-Desafiador):
Barreiras: Resistência a regras, conflitos com autoridade
Adaptações Teóricas:
- Estabelecer combinados claros e participativos
- Explicar o propósito das atividades (por que estamos fazendo isso)
- Evitar confrontos públicos
- Oferecer autonomia controlada
Adaptações Práticas:
- Oferecer escolhas controladas (ex: qual problema resolver primeiro)
- Reforçar comportamentos colaborativos
- Valorizar contribuições positivas do aluno

Síndrome de Down:
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
- Instruções visuais passo a passo

Altas Habilidades / Superdotação:
Barreiras: Desmotivação por falta de desafio, tédio
Adaptações Teóricas:
- Problemas desafiadores e situações-problema ampliadas
- Projetos investigativos com autonomia
- Ampliação curricular (ir além do conteúdo básico)
- Questões que exigem níveis cognitivos superiores (análise, síntese, criação)
Adaptações Práticas:
- Liderança em projetos
- Propostas de resolução alternativa
- Atividades com maior complexidade e profundidade

Dislexia:
Barreiras: Leitura e interpretação de enunciados
Adaptações Teóricas:
- Enunciados claros, curtos e objetivos
- Leitura compartilhada (indicação para o professor ler junto)
- Uso de recursos visuais e esquemas
- Fontes maiores e espaçamento generoso
Adaptações Práticas:
- Avaliação oral quando pertinente
- Apoio na interpretação do problema antes da execução
- Destacar palavras-chave nos enunciados

Discalculia:
Barreiras: Conceitos numéricos e operações
Adaptações Teóricas:
- Uso de material concreto (representações visuais: diagramas, gráficos, tabelas)
- Explorar diferentes formas de resolução
- Exemplos resolvidos passo a passo antes do exercício
- Fórmulas destacadas e referenciadas
Adaptações Práticas:
- Simulações práticas com contexto real
- Uso de calculadora quando o foco não for o cálculo em si
- Representações visuais de conceitos numéricos

Disgrafia:
Barreiras: Escrita manual e organização espacial
Adaptações Teóricas:
- Permitir respostas digitadas ou orais
- Avaliar pelo raciocínio, não pela caligrafia
- Modelos estruturados de resolução (templates)
Adaptações Práticas:
- Uso de tecnologia assistiva
- Foco na resolução oral ou demonstrativa
- Espaços amplos para escrita

Síndrome de Tourette:
Barreiras: Tiques motores ou vocais involuntários, dificuldade de atenção
Adaptações Teóricas:
- Ambiente acolhedor sem chamar atenção para os tiques
- Pausas flexíveis durante atividades
- Instruções claras e segmentadas
Adaptações Práticas:
- Permitir movimentação controlada
- Avaliação focada no conteúdo, não na forma
- Tempo adicional quando necessário

Dispraxia:
Barreiras: Coordenação motora e planejamento motor
Adaptações Teóricas:
- Reduzir exigência de escrita manual extensa
- Templates e organizadores prontos
- Instruções visuais sequenciais
Adaptações Práticas:
- Alternativas à escrita (oral, digital, múltipla escolha)
- Materiais adaptados (folhas com linhas maiores, espaçamento)
- Tempo adicional para tarefas motoras

TOC (Transtorno Obsessivo-Compulsivo):
Barreiras: Rituais compulsivos, perfeccionismo excessivo
Adaptações Teóricas:
- Definir claramente o "bom o suficiente" (rubricas objetivas)
- Limitar opções para reduzir ansiedade de decisão
- Estrutura previsível e consistente
Adaptações Práticas:
- Tempo flexível sem pressão
- Validação parcial do progresso
- Evitar atividades que exijam perfeição visual

═══════════════════════════════════════
PRINCÍPIOS GERAIS DE ADAPTAÇÃO EM EXATAS
═══════════════════════════════════════
- Trabalhar múltiplas representações (visual, simbólica, concreta)
- Avaliar processo e raciocínio, não apenas o resultado
- Oferecer diferentes formas de demonstrar aprendizagem
- Antecipar etapas da atividade
- Diversificar avaliação

═══════════════════════════════════════
ADAPTAÇÃO POR TIPO DE ATIVIDADE
═══════════════════════════════════════
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

═══════════════════════════════════════
TAXONOMIA DE BLOOM — PRESERVAÇÃO
═══════════════════════════════════════
Identifique o nível cognitivo de cada questão e PRESERVE-O na adaptação:
- Lembrar → mantenha como lembrar
- Compreender → mantenha como compreender
- Aplicar → mantenha como aplicar
- Analisar → mantenha como analisar
- Avaliar → mantenha como avaliar
- Criar → mantenha como criar
A adaptação remove BARREIRAS DE ACESSO, não reduz o nível cognitivo.

═══════════════════════════════════════
REGRAS DE FORMATAÇÃO
═══════════════════════════════════════
1. Cada questão em NOVA LINHA: 1. , 2. , 3. etc.
2. Cada alternativa em NOVA LINHA: a) , b) , c) , d)
3. Fórmulas em LINHA ISOLADA com espaçamento
4. Notação escolar Unicode para variáveis: v₀, v², Δv
5. FRAÇÕES em LaTeX inline: \\frac{a}{b}; em equações, use \\frac{23}{24} = \\frac{?}{48}
6. Cada equação/frase com frações em LINHA SEPARADA (nunca concatenar várias frações na mesma linha)
7. Preserve fórmulas, símbolos e unidades integralmente
8. NUNCA use asteriscos (**) ou markdown. Para frações, use LaTeX inline (ex: \\frac{a}{b}). Texto limpo.`;

const ADAPTATION_TOOL = {
  type: "function" as const,
  function: {
    name: "deliver_adaptation",
    description: "Entrega a atividade adaptada estruturada",
    parameters: {
      type: "object",
      properties: {
        version_universal: {
          type: "string",
          description: "Versão universal da atividade adaptada (Design Universal para Aprendizagem)",
        },
        version_directed: {
          type: "string",
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
        autonomy_confirmation: {
          type: "string",
          description: "Confirmação de que a decisão final é do profissional",
        },
      },
      required: [
        "version_universal",
        "version_directed",
        "strategies_applied",
        "pedagogical_justification",
        "implementation_tips",
        "autonomy_confirmation",
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

    // Server-side credit check
    const creditCheck = await checkCredits(admin, user.id, "adapt-activity", corsHeaders);
    if (!creditCheck.ok) return creditCheck.response!;

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
        peiContext = `
═══════════════════════════════════════
PEI DO ALUNO (Plano Educacional Individualizado)
═══════════════════════════════════════
PERFIL DO ALUNO: ${peiData.student_profile || "Não preenchido"}
METAS PEDAGÓGICAS: ${peiData.goals ? JSON.stringify(peiData.goals) : "Não definidas"}
ADAPTAÇÕES CURRICULARES RECOMENDADAS: ${peiData.curricular_adaptations || "Não especificadas"}
ESTRATÉGIAS PEDAGÓGICAS: ${peiData.pedagogical_strategies || "Não especificadas"}
RECURSOS E SUPORTES NECESSÁRIOS: ${peiData.resources_and_support || "Não especificados"}
CRONOGRAMA DE REVISÃO: ${peiData.review_schedule || "Não definido"}
OBSERVAÇÕES ADICIONAIS: ${peiData.additional_notes || "Nenhuma"}`;
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

        documentsContext = `\n═══════════════════════════════════════
DOCUMENTOS DISPONÍVEIS DO ALUNO
═══════════════════════════════════════`;
        for (const [category, files] of Object.entries(categorizedFiles)) {
          documentsContext += `\n${category.toUpperCase()}:`;
          (files as string[]).forEach((f: string) => {
            documentsContext += `\n- ${f}`;
          });
        }
        documentsContext += `\nNOTA: Considere as informações que possam estar contidas nestes documentos ao adaptar.`;
      }
    }

    // ─── PILAR 4: Histórico de chat relevante ───
    let chatContext = "";
    if (student_id) {
      const { data: studentData2 } = await userClient
        .from("class_students")
        .select("name")
        .eq("id", student_id)
        .maybeSingle();

      if (studentData2?.name) {
        const { data: conversations } = await userClient
          .from("chat_conversations")
          .select("id, title, updated_at")
          .eq("user_id", user.id)
          .ilike("title", `%${studentData2.name}%`)
          .order("updated_at", { ascending: false })
          .limit(3);

        if (conversations && conversations.length > 0) {
          chatContext = `\n═══════════════════════════════════════
CONVERSAS ANTERIORES RELEVANTES
═══════════════════════════════════════`;
          for (const conv of conversations) {
            const { data: messages } = await userClient
              .from("chat_messages")
              .select("role, content")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: true })
              .limit(10);

            if (messages && messages.length > 0) {
              chatContext += `\n--- Conversa: ${conv.title} ---`;
              messages.forEach((msg: any) => {
                const role = msg.role === "user" ? "Professor" : "ISA";
                const preview = msg.content.substring(0, 300);
                chatContext += `\n[${role}]: ${preview}${msg.content.length > 300 ? "..." : ""}`;
              });
            }
          }
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

    // Build user prompt with full context
    let userPrompt = `═══════════════════════════════════════
CONTEXTO COMPLETO PARA ADAPTAÇÃO
═══════════════════════════════════════

BASES UTILIZADAS NESTA ADAPTAÇÃO:
1. ✓ Barreiras identificadas do aluno
2. ${peiContext ? "✓" : "○"} PEI (Plano Educacional Individualizado)
3. ${documentsContext ? "✓" : "○"} Documentos de referência (laudos, relatórios)
4. ${chatContext ? "✓" : "○"} Histórico de conversas relevantes
5. ✓ Contexto completo da avaliação

═══════════════════════════════════════
TIPO DE ATIVIDADE: ${sanitizedType}
═══════════════════════════════════════

BARREIRAS OBSERVÁVEIS DO ALUNO:
- ${activeBarriersList}`;

    if (sanitizedObservations) {
      userPrompt += `\n\nOBSERVAÇÕES DO PROFESSOR (contexto adicional para personalização):
${sanitizedObservations}`;
    }

    if (studentContext) {
      userPrompt += `\n\nCONTEXTO ENRIQUECIDO DO ALUNO:${studentContext}`;
    }

    if (peiContext) {
      userPrompt += `\n${peiContext}`;
    }

    if (documentsContext) {
      userPrompt += `\n${documentsContext}`;
    }

    if (chatContext) {
      userPrompt += `\n${chatContext}`;
    }

    userPrompt += `\n\n═══════════════════════════════════════
ATIVIDADE ORIGINAL PARA ADAPTAR:
═══════════════════════════════════════
${sanitizedActivity}`;

    if (question_images && Array.isArray(question_images) && question_images.length > 0) {
      userPrompt += `\n\nNOTA: A atividade contém ${question_images.length} imagem(ns) associadas às questões. Preserve referências a figuras/imagens nas adaptações.`;
    }

    userPrompt += `\n\nINSTRUÇÕES FINAIS:
1. Cruze TODOS os pilares disponíveis acima para produzir a adaptação mais rica possível
2. Se o PEI estiver disponível, siga as estratégias recomendadas nele
3. Se houver documentos (laudos), considere as informações que possam estar contidas
4. Se houver histórico de chat, mantenha consistência com orientações anteriores
5. Gere a VERSÃO UNIVERSAL e a VERSÃO DIRECIONADA
6. Liste as estratégias aplicadas com base nos pilares
7. Forneça justificativa pedagógica fundamentada
8. Inclua dicas de implementação prática
9. Confirme a autonomia do profissional`;

    const SYSTEM_PROMPT_FINAL = SYSTEM_PROMPT;

    // Call AI — using pro model for complex pedagogical reasoning
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
          { role: "system", content: SYSTEM_PROMPT_FINAL },
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

    // Include question images in the result so they're available in history
    const resultWithImages = {
      ...adaptationResult,
      question_images: Array.isArray(question_images) ? question_images : [],
    };

    // Save to adaptations_history
    const { error: insertError } = await admin.from("adaptations_history").insert({
      teacher_id: user.id,
      student_id: student_id || null,
      class_id: class_id || null,
      original_activity: sanitizedActivity,
      activity_type: sanitizedType,
      barriers_used: barriers,
      adaptation_result: resultWithImages,
      model_used: modelName,
      tokens_used: tokensUsed,
      school_id: school_id || null,
    });

    if (insertError) {
      console.error("Failed to save adaptation history:", insertError);
    }

    // Deduct credit server-side
    await deductCredit(admin, user.id, "adapt-activity");

    return new Response(
      JSON.stringify({
        adaptation: adaptationResult,
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

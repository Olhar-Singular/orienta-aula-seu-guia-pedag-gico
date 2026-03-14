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
MISSÃO
═══════════════════════════════════════
Adaptar atividades escolares para REMOVER BARREIRAS à aprendizagem, preservando rigorosamente os objetivos pedagógicos e o nível cognitivo original (Taxonomia de Bloom revisada).

═══════════════════════════════════════
TRAVAS DE SEGURANÇA (INVIOLÁVEIS)
═══════════════════════════════════════
1. NUNCA faça diagnóstico clínico — não mencione TDAH, TEA, dislexia, discalculia ou qualquer CID/DSM
2. SEMPRE preserve os objetivos de aprendizagem e o nível cognitivo da atividade original
3. Foque em BARREIRAS OBSERVÁVEIS em sala, não em condições médicas
4. Use linguagem PEDAGÓGICA, nunca clínica
5. Toda adaptação deve ser aplicável em sala de aula regular sem recursos especializados
6. NÃO reduza a complexidade conceitual — reduza as barreiras de ACESSO ao conteúdo

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
ESTRATÉGIAS POR BARREIRA (CATÁLOGO)
═══════════════════════════════════════

PROCESSAMENTO:
- Enunciados longos → Segmente em frases curtas; destaque a pergunta principal; numere os dados fornecidos
- Conceitos abstratos → Insira analogias concretas; forneça exemplo resolvido antes; use representação visual
- Múltiplos passos → Transforme em etapas numeradas sequenciais; adicione checkpoints intermediários
- Conceitos semelhantes → Crie tabela comparativa; destaque as diferenças-chave; use cores/ícones distintos

ATENÇÃO:
- Foco em atividades longas → Divida em blocos menores com pausas; use cronômetro sugerido; adicione marcadores de progresso
- Distração ambiental → Reduza elementos visuais desnecessários; use layout limpo com espaço em branco
- Retomar tarefa → Inclua resumos parciais; adicione "onde parei" entre seções
- Lembretes constantes → Insira lembretes visuais (ícones, caixas de destaque); repita instruções-chave

RITMO:
- Mais tempo → Reduza quantidade preservando representatividade; marque questões prioritárias vs. extras
- Muito rápido → Adicione etapa de revisão obrigatória; inclua desafio extra para quem terminar
- Prazos curtos → Divida entrega em etapas com prazos parciais; priorize questões essenciais
- Ritmo irregular → Ofereça roteiro visual de progresso; permita ordem flexível de resolução

ENGAJAMENTO:
- Desinteresse escrita → Alterne formatos (ligar, circular, completar); inclua elementos visuais/interativos
- Resiste a novidades → Conecte com formato familiar; forneça exemplo completo primeiro
- Mediação direta → Adicione instruções detalhadas passo-a-passo; inclua "dicas" progressivas
- Visual/manipulativo → Incorpore diagramas, tabelas, fluxogramas; sugira materiais concretos

EXPRESSÃO:
- Respostas longas → Ofereça roteiro estruturado (início/meio/fim); permita tópicos ao invés de parágrafos
- Melhor oral → Sugira gravação de áudio como alternativa; forneça roteiro de resposta oral
- Ortografia → Não penalize erros ortográficos; foque na avaliação do conteúdo conceitual
- Organizar ideias → Forneça organizador gráfico; use templates de resposta com lacunas

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
- Lembrar → mantenha como lembrar (não transforme em reconhecer)
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
4. Notação escolar Unicode: v₀, v², m/s², Δv — NUNCA LaTeX
5. Preserve fórmulas, símbolos e unidades integralmente
6. NUNCA use asteriscos (**) ou markdown. Texto limpo.
7. Títulos em CAIXA ALTA para seções
8. Use linhas em branco entre questões para legibilidade

═══════════════════════════════════════
QUALIDADE DA SAÍDA
═══════════════════════════════════════
- Versão Universal: aplicável para TODA a turma, beneficia todos sem estigmatizar
- Versão Direcionada: adaptações ESPECÍFICAS para as barreiras indicadas, mais intensas
- Estratégias: liste EXATAMENTE quais técnicas do catálogo acima foram aplicadas e POR QUÊ
- Justificativa: explique a lógica pedagógica SEM termos clínicos, referenciando DUA
- Dicas: orientações PRÁTICAS e IMEDIATAS para o professor implementar em sala

IMPORTANTE: Você é uma ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.`;

const ADAPTATION_TOOL = {
  type: "function" as const,
  function: {
    name: "deliver_adaptation",
    description: "Entrega a atividade adaptada seguindo os princípios do Design Universal para Aprendizagem (DUA), com duas versões da atividade e orientações pedagógicas completas.",
    parameters: {
      type: "object",
      properties: {
        version_universal: {
          type: "string",
          description: "Versão adaptada para TODA a turma usando princípios do Design Universal (DUA). Deve beneficiar todos os alunos sem estigmatizar ninguém. Aplique: clareza nos enunciados, organização visual, exemplos quando apropriado, instruções explícitas. FORMATO: cada questão numerada (1. , 2.) em linha separada, cada alternativa (a) , b) , c) , d)) em linha separada. Texto limpo sem markdown.",
        },
        version_directed: {
          type: "string",
          description: "Versão com adaptações ESPECÍFICAS e mais intensas para as barreiras observáveis indicadas. Inclua scaffolding adicional, suportes visuais, simplificação de formato (não de conteúdo), dicas integradas e formatos alternativos de resposta quando necessário. PRESERVE o nível cognitivo (Bloom). FORMATO: cada questão numerada em linha separada, cada alternativa em linha separada. Texto limpo sem markdown.",
        },
        strategies_applied: {
          type: "array",
          items: { type: "string" },
          description: "Lista detalhada de estratégias pedagógicas aplicadas. Cada item deve nomear a técnica E a barreira que ela endereça. Ex: 'Segmentação de enunciados (barreira: processamento de enunciados longos)', 'Scaffolding gradual com exemplo resolvido (barreira: conceitos abstratos)'",
        },
        pedagogical_justification: {
          type: "string",
          description: "Explicação pedagógica fundamentada nos 3 princípios do DUA. Descreva como cada princípio foi aplicado, qual nível cognitivo (Bloom) foi preservado, e por que as adaptações removem barreiras sem reduzir exigência conceitual. SEM menções clínicas. Texto limpo sem markdown.",
        },
        implementation_tips: {
          type: "array",
          items: { type: "string" },
          description: "Dicas PRÁTICAS e IMEDIATAS para o professor aplicar em sala de aula. Inclua: como apresentar a atividade, como mediar, como avaliar, como adaptar o ambiente físico se necessário, e como usar as duas versões (universal e direcionada) simultaneamente sem estigmatizar.",
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
      question_images,
      observation_notes,
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

    // Fetch student history if student_id is provided
    let studentContext = "";
    if (student_id) {
      // Get student info
      const { data: student } = await admin
        .from("class_students")
        .select("name, notes")
        .eq("id", student_id)
        .single();

      // Get student's barrier history
      const { data: studentBarriers } = await admin
        .from("student_barriers")
        .select("dimension, barrier_key, notes, is_active")
        .eq("student_id", student_id);

      // Get recent adaptations for this student (last 5)
      const { data: pastAdaptations } = await admin
        .from("adaptations_history")
        .select("activity_type, original_activity, adaptation_result, created_at")
        .eq("student_id", student_id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (student) {
        studentContext += `\nCONTEXTO DO ALUNO:`;
        studentContext += `\n- Nome: ${student.name}`;
        if (student.notes) studentContext += `\n- Observações do professor: ${student.notes}`;
      }

      if (studentBarriers && studentBarriers.length > 0) {
        const activeBarriers = studentBarriers.filter((b: any) => b.is_active);
        if (activeBarriers.length > 0) {
          studentContext += `\n\nHISTÓRICO COMPLETO DE BARREIRAS DO ALUNO:`;
          activeBarriers.forEach((b: any) => {
            const note = b.notes ? ` (obs: ${b.notes})` : "";
            studentContext += `\n- [${b.dimension}] ${b.barrier_key}${note}`;
          });
        }
      }

      if (pastAdaptations && pastAdaptations.length > 0) {
        studentContext += `\n\nADAPTAÇÕES ANTERIORES DESTE ALUNO (${pastAdaptations.length} mais recentes):`;
        pastAdaptations.forEach((a: any, idx: number) => {
          const strategies = (a.adaptation_result as any)?.strategies_applied;
          studentContext += `\n${idx + 1}. Tipo: ${a.activity_type || "atividade"} | Estratégias: ${strategies?.join(", ") || "N/A"}`;
        });
        studentContext += `\n\nUse este histórico para manter CONSISTÊNCIA nas estratégias que funcionam e VARIAR abordagens quando necessário.`;
      }
    }

    // Build image context
    let imageContext = "";
    if (question_images && Array.isArray(question_images) && question_images.length > 0) {
      imageContext = `\n\nIMAGENS ASSOCIADAS ÀS QUESTÕES:
As seguintes questões possuem imagens (gráficos, diagramas, figuras) que são PARTE INTEGRAL do enunciado.
OBRIGATÓRIO ao adaptar:
- PRESERVE todas as referências às imagens
- Adicione instruções de leitura visual ("observe no gráfico...", "identifique na figura...")
- Na versão direcionada, adicione legendas explicativas ou guias de interpretação da imagem
${question_images.map((img: any) => `- Questão "${sanitize(img.question_text, 100)}": contém imagem pedagógica`).join("\n")}`;
    }

    const activityTypeLabel: Record<string, string> = {
      prova: "PROVA (avaliação formal — manter rigor avaliativo, adaptar formato não conteúdo)",
      exercicio: "EXERCÍCIO (prática — pode incluir scaffolding mais intenso e dicas)",
      atividade_casa: "ATIVIDADE DE CASA (sem mediação do professor — instruções autoexplicativas)",
      trabalho: "TRABALHO (produção — dividir em etapas, fornecer templates e rubricas)",
    };

    const typeDescription = activityTypeLabel[sanitizedType] || `${sanitizedType} (atividade pedagógica)`;

    const userPrompt = `CONTEXTO DA ADAPTAÇÃO:
Tipo: ${typeDescription}

ATIVIDADE ORIGINAL:
${sanitizedActivity}

BARREIRAS OBSERVÁVEIS IDENTIFICADAS PELO PROFESSOR:
${barriersDescription}
${studentContext}${imageContext}${observation_notes ? `\n\nOBSERVAÇÕES DO PROFESSOR (contexto adicional para personalização):\n${sanitize(observation_notes, 2000)}` : ""}

INSTRUÇÕES DE ADAPTAÇÃO:
1. Analise cada questão e identifique seu nível cognitivo (Bloom)
2. Para cada barreira listada, aplique as estratégias correspondentes do catálogo
3. Na VERSÃO UNIVERSAL: aplique melhorias que beneficiem TODA a turma (DUA Princípios 1-3)
4. Na VERSÃO DIRECIONADA: aplique scaffolding ESPECÍFICO para as barreiras indicadas, mais intenso
5. PRESERVE o conteúdo conceitual e o nível cognitivo — adapte apenas o FORMATO e o ACESSO
6. Se houver questões com imagens, adicione suporte para interpretação visual
7. Cada questão em LINHA SEPARADA (1. , 2.) — cada alternativa em LINHA SEPARADA (a) , b) , c) , d))
8. NUNCA use asteriscos, markdown ou LaTeX. Texto limpo com notação Unicode escolar.`;

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
    });

    if (insertError) {
      console.error("Failed to save adaptation history:", insertError);
    }

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

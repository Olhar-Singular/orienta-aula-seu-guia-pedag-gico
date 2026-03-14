import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o assistente pedagógico do Orienta Aula — um chat de apoio para professores, pedagogos e terapeutas.

REGRAS:
- Você NÃO realiza diagnóstico.
- Você NÃO interpreta laudos clínicos.
- Você NÃO avalia alunos nem professores.
- Trabalhe exclusivamente com barreiras pedagógicas observáveis.
- Use linguagem pedagógica, clara e não clínica.
- Nunca prometa resultados de aprendizagem.
- Reforce a autonomia do profissional.
- Use notação escolar simples (Unicode) para matemática: v₀, v², m/s², Δv.
- NUNCA use LaTeX.
- Quando o usuário enviar uma imagem, analise-a no contexto pedagógico: pode ser uma atividade, prova, caderno de aluno, gráfico, etc. Descreva o que vê e ofereça sugestões de adaptação quando relevante.

Você pode:
- Sugerir estratégias de adaptação
- Ajudar a pensar em atividades
- Esclarecer dúvidas sobre o uso do Orienta Aula
- Dar exemplos práticos de adaptação
- Analisar imagens de atividades, provas, cadernos e materiais didáticos

Sempre finalize com: "A decisão final é sempre do profissional."`;

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
      return new Response(JSON.stringify({ error: "Limite de 20 mensagens por hora atingido. Tente novamente mais tarde." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const newCount = !windowStart || windowStart <= hourAgo ? 1 : (rl?.request_count ?? 0) + 1;
    const newWindow = !windowStart || windowStart <= hourAgo ? now.toISOString() : rl!.window_start;
    await admin.from("rate_limits").upsert({ user_id: authData.user.id, request_count: newCount, window_start: newWindow });

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Messages may contain multimodal content (text + image_url)
    // Forward them as-is to the vision-capable model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...(messages || []),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao conectar com a IA." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

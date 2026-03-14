import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { sanitize } from "../_shared/sanitize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting — max 10 extractions per hour
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: rl } = await admin
      .from("rate_limits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3_600_000);
    const windowStart = rl?.window_start ? new Date(rl.window_start) : null;

    if (windowStart && windowStart > hourAgo && (rl?.request_count ?? 0) >= 10) {
      return new Response(
        JSON.stringify({ error: "Limite de 10 extrações por hora atingido. Tente novamente mais tarde." }),
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

    // Parse uploaded file
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return new Response(JSON.stringify({ error: "Nenhum arquivo enviado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Arquivo muito grande. Máximo 10 MB." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    // Validate magic bytes
    const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    const isDocx = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;

    if (!isPdf && !isDocx && !isJpeg && !isPng) {
      return new Response(
        JSON.stringify({ error: "Tipo de arquivo inválido. Apenas PDF, DOCX, JPEG e PNG." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt =
      "Você é um assistente especializado em extrair questões de documentos educacionais brasileiros. Extraia todas as questões encontradas.";

    const extractPrompt =
      "Extraia todas as questões deste documento/imagem. Para cada questão extraia: text (enunciado completo), options (array de alternativas se houver), correct_answer (índice da resposta correta começando em 0, ou null se não identificável), subject (matéria), topic (tópico).";

    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (isDocx) {
      // Extract text from DOCX via mammoth, fallback to XML parsing
      let extractedText = "";
      try {
        const mammoth = await import("https://esm.sh/mammoth@1.8.0");
        const result = await mammoth.default.extractRawText({ arrayBuffer: bytes.buffer });
        extractedText = result.value;
      } catch (e) {
        console.error("mammoth fallback to XML:", e);
        try {
          const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");
          const zip = await JSZip.loadAsync(bytes);
          const xml = await zip.file("word/document.xml")?.async("string");
          extractedText = xml?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";
        } catch (zipErr) {
          console.error("ZIP fallback failed:", zipErr);
        }
      }

      if (!extractedText) {
        return new Response(
          JSON.stringify({ error: "Não foi possível extrair texto do documento." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      messages.push({
        role: "user",
        content: `${extractPrompt}\n\nTexto do documento:\n${sanitize(extractedText, 50000)}`,
      });
    } else {
      // PDF or Image — send as base64 multimodal
      const mimeType = isPdf
        ? "application/pdf"
        : isJpeg
        ? "image/jpeg"
        : "image/png";
      const b64 = base64Encode(bytes);
      messages.push({
        role: "user",
        content: [
          { type: "text", text: extractPrompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}` } },
        ],
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "extract_questions",
              description: "Return extracted questions as structured data",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string", description: "Full question text" },
                        options: { type: "array", items: { type: "string" } },
                        correct_answer: { type: "integer", description: "0-based index or null" },
                        subject: { type: "string" },
                        topic: { type: "string" },
                      },
                      required: ["text", "subject"],
                    },
                  },
                },
                required: ["questions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_questions" } },
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
      return new Response(JSON.stringify({ error: "Falha na extração por IA." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let questions: any[] = [];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        questions = parsed.questions || [];
      } catch {
        questions = [];
      }
    }

    return new Response(JSON.stringify({ questions, source_file_name: file.name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-questions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { prompt, context } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imagePrompt = `Crie uma ilustração pedagógica educacional clara e limpa para uma questão escolar.

CONTEXTO: ${context || "Questão educacional"}

DESCRIÇÃO DA IMAGEM: ${prompt}

REGRAS:
- Estilo: ilustração educacional, limpa, com cores claras e alto contraste
- Use rótulos e legendas em português quando necessário
- Sem texto decorativo, apenas rótulos essenciais
- Fundo branco ou muito claro
- Traços limpos e profissionais
- Se for um gráfico, inclua eixos rotulados
- Se for uma figura de física (ondas, circuitos, etc.), use representações técnicas corretas
- Se for biologia, use ilustrações anatômicas claras
- Se for geografia, use mapas ou representações geográficas precisas
- Se for matemática, use representações geométricas precisas`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [
          { role: "user", content: imagePrompt },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI image generation error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha na geração da imagem." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      return new Response(JSON.stringify({ error: "A IA não gerou uma imagem. Tente com uma descrição diferente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to storage
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    const fileName = `${user.id}/generated_${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
    const { error: uploadError } = await adminClient.storage
      .from("question-images")
      .upload(fileName, binaryData, { contentType: "image/png" });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Return base64 as fallback
      return new Response(JSON.stringify({ image_url: imageData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { publicUrl } } = adminClient.storage.from("question-images").getPublicUrl(fileName);

    return new Response(JSON.stringify({ image_url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-question-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Shared CORS helper.
//
// Em vez de devolver "Access-Control-Allow-Origin: *" (que permite que qualquer
// site malicioso faça o navegador da vítima chamar nossas funções com o JWT
// dela), refletimos apenas Origins que estejam na allowlist configurada via
// env `ALLOWED_ORIGINS` (lista separada por vírgula). Origens desconhecidas
// recebem cabeçalhos sem ACAO, e o navegador bloqueia a requisição.
//
// Defaults razoáveis cobrem dev local e localhost. Em produção, definir
// ALLOWED_ORIGINS=https://app.exemplo.com,https://www.exemplo.com no
// Supabase (Project Settings > Edge Functions > Secrets).

const DEFAULT_ALLOWED = [
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "https://staging.olharsingular.com",
  "https://app.olharsingular.com",
  "https://olharsingular.com",
];

function getAllowList(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  const fromEnv = raw
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  return fromEnv.length > 0 ? fromEnv : DEFAULT_ALLOWED;
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowList = getAllowList();
  const allowed = allowList.includes(origin) ? origin : allowList[0] ?? "";

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

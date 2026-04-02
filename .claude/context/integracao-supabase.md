# Integração com Supabase

## Conexão

```typescript
// src/integrations/supabase/client.ts (auto-gerado — NÃO EDITAR)
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
```

Variáveis injetadas pelo Vite via `import.meta.env.VITE_*`.
Fallback hardcoded em `vite.config.ts` para dev (project ID + anon key).

## Autenticação

| Operação | Método Supabase |
|----------|----------------|
| Login | `supabase.auth.signInWithPassword({ email, password })` |
| Signup | `supabase.auth.signUp({ email, password, options: { data: { name } } })` |
| Logout | `supabase.auth.signOut()` |
| Session listener | `supabase.auth.onAuthStateChange(callback)` |
| Get session | `supabase.auth.getSession()` |

## Edge Functions

| Function | Método | Auth | Retorno |
|----------|--------|------|---------|
| `adapt-activity` | POST + SSE stream | Bearer token | Streaming chunks |
| `regenerate-question` | POST | Bearer token | JSON |
| `extract-questions` | POST | Bearer token | JSON |
| `generate-question-image` | POST | Bearer token | JSON (image URL) |
| `generate-pei` | POST | Bearer token | JSON |
| `generate-adaptation` | POST | Bearer token | JSON |
| `analyze-barriers` | POST | Bearer token | JSON |
| `chat` | POST | Bearer token | JSON |
| `admin-ai-usage-report` | POST | Bearer token | JSON (report) |
| `admin-manage-teachers` | POST | Bearer token | JSON |

### Shared Helper: aiConfig.ts

Todas as edge functions (exceto admin) usam `getAiConfig()` de `_shared/aiConfig.ts`.
Nunca ler `LOVABLE_API_KEY` ou `AI_API_KEY` diretamente nas funções — usar o helper.

```typescript
import { getAiConfig, resolveImagePayloadFields } from "../_shared/aiConfig.ts";

const ai = getAiConfig(); // throws se nenhuma key configurada
fetch(`${ai.baseUrl}/chat/completions`, {
  headers: { Authorization: `Bearer ${ai.apiKey}` },
  body: JSON.stringify({ model: ai.resolveModel("google/gemini-2.5-pro"), ... }),
});
```

### Padrão de Chamada

```typescript
// Via streamAI (streaming)
streamAI({
  endpoint: "adapt-activity",
  body: { original_activity, activity_type, barriers, ... },
  onDelta: (text) => ...,
  onDone: () => ...,
  onError: (msg) => ...,
});

// Via supabase.functions.invoke (request-response)
const { data, error } = await supabase.functions.invoke("function-name", {
  body: { ... },
});
```

**Nota**: `streamAI` usa `fetch` diretamente (não `supabase.functions.invoke`) para ter acesso ao ReadableStream.

## RPCs

| RPC | Uso | Auth |
|-----|-----|------|
| `get_shared_adaptation(p_token)` | Buscar adaptação compartilhada | Sem auth (público) |

## Padrões de Query

### Leitura

```typescript
const { data, error } = await supabase
  .from("table_name")
  .select("col1, col2, related_table(col)")
  .eq("filter_col", value)
  .order("created_at", { ascending: false });
```

### Escrita

```typescript
// Insert
await supabase.from("table").insert({ ... });

// Upsert (barreiras do aluno)
await supabase.from("student_barriers").upsert({ ... });

// Delete + Insert (pattern para substituir barreiras)
await supabase.from("student_barriers").delete().eq("student_id", id);
await supabase.from("student_barriers").insert(newBarriers);
```

## Tabelas e Relacionamentos

```
schools
  └── school_members (user_id, role)
       └── profiles (user details)

classes (teacher_id, school_id)
  └── class_students
       ├── student_barriers (barrier_key, dimension, is_active)
       ├── student_pei (goals, strategies)
       └── student_documents (file_url, file_type)

adaptations_history (teacher_id, class_id, student_id)
  └── shared_adaptations (token, expires_at)

chat_conversations (user_id)
  └── chat_messages (role, content)

questions (created_by, school_id)

ai_usage_logs (school_id, user_id)
ai_model_pricing (model, provider)
```

# Plano: AI Provider Fallback (LOVABLE_API_KEY → Google AI direto)

## Objetivo

Criar um mecanismo de fallback nas edge functions para que, quando `LOVABLE_API_KEY` não estiver configurada, a aplicação use `AI_API_KEY` apontando direto para a API do Google AI Studio — mantendo compatibilidade total com o comportamento atual e sem quebrar nada.

---

## Contexto Tecnico

### Situacao atual
- 7 edge functions chamam `https://ai.gateway.lovable.dev/v1/chat/completions`
- Todas usam `LOVABLE_API_KEY` como Bearer token
- A API do gateway e OpenAI-compatible
- `generate-question-image` usa o modelo `google/gemini-3.1-flash-image-preview` com campo `modalities`

### Solucao proposta
Criar `_shared/aiConfig.ts` — um helper centralizado que resolve qual endpoint/key usar. Cada edge function importa e usa esse helper em vez de ler `LOVABLE_API_KEY` diretamente.

### Logica de resolucao
```
LOVABLE_API_KEY existe?
  SIM → baseUrl = https://ai.gateway.lovable.dev, key = LOVABLE_API_KEY, model sem alteracao
  NAO → baseUrl = https://generativelanguage.googleapis.com/v1beta/openai, key = AI_API_KEY, model com mapeamento
```

### Mapeamento de modelos (necessario so no fallback)
O gateway do Lovable usa prefixo `google/` nos nomes. A API direta do Google nao:
```
"google/gemini-2.5-pro"                  → "gemini-2.5-pro"
"google/gemini-2.5-flash"                → "gemini-2.5-flash"
"google/gemini-3-flash-preview"          → "gemini-2.0-flash"
"google/gemini-3.1-flash-image-preview"  → "gemini-2.0-flash-preview-image-generation"
```

### Nota sobre generate-question-image
O campo `modalities: ["image", "text"]` pode ter nome diferente na API direta do Google. Tratar separado: se fallback ativo, usar `response_modalities` em vez de `modalities` (formato nativo da Gemini API). Investigar durante RED.

---

## Variaveis de Ambiente

| Variavel | Descricao | Obrigatoria |
|----------|-----------|-------------|
| `LOVABLE_API_KEY` | Chave atual do gateway Lovable | Nao (legado) |
| `AI_API_KEY` | Chave do Google AI Studio | Sim se LOVABLE_API_KEY ausente |

Pelo menos uma das duas deve estar presente. Se nenhuma estiver, retornar 500 com mensagem clara.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/functions/_shared/aiConfig.ts` | Criar | Helper central que resolve key, baseUrl e nome do modelo |
| `supabase/functions/_shared/logAiUsage.ts` | Editar | Remover hardcode do endpoint do Lovable (linha 105) |
| `supabase/functions/adapt-activity/index.ts` | Editar | Usar aiConfig em vez de LOVABLE_API_KEY direto |
| `supabase/functions/regenerate-question/index.ts` | Editar | Idem |
| `supabase/functions/extract-questions/index.ts` | Editar | Idem |
| `supabase/functions/generate-question-image/index.ts` | Editar | Idem + tratar `modalities` vs `response_modalities` |
| `supabase/functions/chat/index.ts` | Editar | Idem |
| `supabase/functions/analyze-barriers/index.ts` | Editar | Idem |
| `supabase/functions/generate-pei/index.ts` | Editar | Idem |
| `supabase/functions/generate-adaptation/index.ts` | Editar | Idem |
| `src/test/aiConfig.test.ts` | Criar | Testes do helper aiConfig |

---

## Interface do Helper (aiConfig.ts)

```typescript
export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  resolveModel: (model: string) => string;
  isLovable: boolean;
}

export function getAiConfig(): AiConfig
// Throws se nenhuma key estiver configurada

export function resolveImagePayloadFields(isLovable: boolean): Record<string, unknown>
// Retorna { modalities: [...] } ou { response_modalities: [...] } dependendo do provider
```

Uso em cada edge function:
```typescript
// Antes (em cada funcao):
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
if (!LOVABLE_API_KEY) return error500("LOVABLE_API_KEY nao configurada");
// fetch com Authorization: `Bearer ${LOVABLE_API_KEY}`
// url: "https://ai.gateway.lovable.dev/v1/chat/completions"

// Depois:
const ai = getAiConfig(); // throws se sem key
// fetch com Authorization: `Bearer ${ai.apiKey}`
// url: `${ai.baseUrl}/chat/completions`
// model: ai.resolveModel("google/gemini-2.5-flash")
```

---

## Testes Necessarios

| Teste | Arquivo | O que valida |
|-------|---------|-------------|
| Retorna config Lovable quando LOVABLE_API_KEY presente | `src/test/aiConfig.test.ts` | key, baseUrl, isLovable=true, modelo sem alteracao |
| Retorna config Google quando so AI_API_KEY presente | `src/test/aiConfig.test.ts` | key, baseUrl correto, isLovable=false |
| Lovable tem prioridade quando ambas presentes | `src/test/aiConfig.test.ts` | usa LOVABLE_API_KEY |
| Throws quando nenhuma key presente | `src/test/aiConfig.test.ts` | erro descritivo |
| resolveModel mapeia nomes corretamente no fallback | `src/test/aiConfig.test.ts` | todos os 4 modelos mapeados |
| resolveModel nao altera modelos no modo Lovable | `src/test/aiConfig.test.ts` | modelo retornado identico ao input |
| resolveImagePayloadFields retorna campo correto | `src/test/aiConfig.test.ts` | `modalities` vs `response_modalities` |

---

## Sequencia de Implementacao

### Fase 1 — Helper aiConfig (TDD)

1. **[RED]** Criar `src/test/aiConfig.test.ts` com todos os 7 testes acima — todos devem falhar
2. **[GREEN]** Criar `supabase/functions/_shared/aiConfig.ts` implementando `getAiConfig()` e `resolveImagePayloadFields()`
3. **[REFACTOR]** Limpar tipos, garantir mensagens de erro claras

### Fase 2 — Atualizar edge functions

4. Atualizar `adapt-activity/index.ts` — trocar bloco LOVABLE_API_KEY pelo helper
5. Atualizar `regenerate-question/index.ts`
6. Atualizar `extract-questions/index.ts`
7. Atualizar `chat/index.ts`
8. Atualizar `analyze-barriers/index.ts`
9. Atualizar `generate-pei/index.ts`
10. Atualizar `generate-adaptation/index.ts`
11. Atualizar `generate-question-image/index.ts` — incluir logica de `modalities`
12. Atualizar `_shared/logAiUsage.ts` — remover hardcode do endpoint Lovable (linha 105), receber endpoint dinamicamente

### Fase 3 — Validacao

13. `make test` — todos os testes passando
14. `make lint` — sem erros
15. Testar manualmente com `make fn-serve` apontando para Google AI Studio

---

## Como obter a Google AI Studio API Key

1. Acessar https://aistudio.google.com/apikey
2. Criar uma API key
3. Adicionar no Supabase: `supabase secrets set AI_API_KEY=<sua-key>`
4. Para producao: adicionar no painel do Supabase > Project Settings > Edge Functions > Secrets

---

## Riscos

- **generate-question-image**: O campo `modalities` pode ter comportamento diferente na API direta — precisa validar manualmente apos implementar
- **Modelos preview**: `gemini-2.0-flash-preview-image-generation` pode nao estar disponivel em todas as regioes ou tiers do Google AI Studio
- **logAiUsage.ts linha 105**: Tem o endpoint do Lovable hardcoded como default — precisa receber o endpoint real usado em cada chamada para o log ficar correto

## Perguntas em Aberto

- Nenhuma — podemos avancar para `/tdd`

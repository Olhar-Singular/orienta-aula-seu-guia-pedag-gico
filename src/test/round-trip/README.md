# Round-trip tests

Exercitam o fluxo completo "gerar → editar → salvar → reabrir" contra um
Supabase real (local por padrão), pra pegar bugs de serialização e quebras
de schema que testes com mock não capturam.

## Rodando localmente

```bash
# 1. Subir Supabase local (se não subiu ainda)
make sb-start

# 2. Exportar credenciais do Supabase local
eval "$(supabase status -o env | grep -E 'API_URL|SERVICE_ROLE_KEY' | sed 's/^/export /')"

# 3. Rodar os testes
npm run test:round-trip
```

Ou, em uma linha, deixando o helper descobrir via `supabase status`:

```bash
SUPABASE_URL=http://localhost:54321 \
SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json | jq -r .SERVICE_ROLE_KEY) \
npm run test:round-trip
```

## Variáveis esperadas

| Var | Fallback | Uso |
|---|---|---|
| `SUPABASE_URL` | `http://localhost:54321` | Endpoint da API |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Bypass RLS para seed/teardown |
| `SUPABASE_ANON_KEY` | — | (opcional) Clientes de teste sem privilégio |

Sem `SUPABASE_SERVICE_ROLE_KEY` os testes marcam `describe.skip` com mensagem
explicando o porquê, para não falhar CI em ambientes sem Supabase.

## O que cada teste garante

- `adaptation.test.ts` — layout editado da versão dirigida sobrevive
  save→reload, sem contaminar a versão universal.

Cada teste cria seu próprio `teacher_id` UUID isolado. Ao final limpa as
linhas inseridas. Se um teste aborta no meio, a próxima execução
sobrescreve via `afterEach`.

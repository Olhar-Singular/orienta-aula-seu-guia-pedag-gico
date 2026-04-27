# Pipeline Supabase — Estado atual, problemas e roadmap

> Documento vivo sobre o fluxo de CI/CD do Supabase. Contexto: hoje existe **um único projeto Supabase** atrelado a esta base de código (a produção "antiga" roda em outro projeto gerenciado pelo Lovable). O objetivo é, até estarmos prontos para desligar o Lovable, ter um fluxo **totalmente automatizado e seguro** de deploy desse Supabase a partir do GitHub — sem que o desenvolvedor precise abrir o dashboard do Supabase ou rodar `db push` na mão.

## Estado atual (abril/2026)

Arquivo: [`.github/workflows/supabase.yml`](../../.github/workflows/supabase.yml)

O que ele faz hoje, em ordem:

1. Dispara em push pra `main` quando `supabase/**` muda.
2. `supabase link` → `supabase db push` → deploy de todas as edge functions → `gen types` → auto-commit de `types.ts` de volta em `main`.
3. Concorrência serializada (`cancel-in-progress: false`).

**Não roda em paralelo com o Lovable** — esse workflow só afeta o Supabase novo, que ainda não atende usuário final. Isso dá margem pra experimentar sem risco pra produção real.

## Princípio norteador

> Todo caminho do código em `main` até o Supabase deve ser: **automatizado, observável e reversível**. O desenvolvedor não toca no dashboard do Supabase. A Action faz o trabalho e reclama alto quando algo quebra.

Automação **sem** segurança é um botão vermelho grande acessível por qualquer commit. Segurança **sem** automação é "voltamos a editar schema no dashboard". A meta é os dois juntos.

---

## Problemas identificados

Cada item tem: **gravidade** (🔴/🟡/🟢), **por que importa**, **o que fazer**, e **quando fazer** (fases 1/2/3 abaixo).

### 1. 🔴 Deploy não depende do CI passar

**Problema**: `supabase.yml` e `deploy.yml` (lint/test/build) rodam em paralelo. Se o build quebrar mas o push em `main` aconteceu, a migration vai pro Supabase mesmo assim.

**Por que importa**: uma migration pode introduzir uma quebra de contrato que só `tsc` pegaria. Sem gate, o erro chega no banco antes do código.

**Solução**: mudar trigger de `supabase.yml` de `push` para `workflow_run` escutando a conclusão bem-sucedida do CI. Só aplica migration se o CI daquele commit ficou verde.

**Quando**: Fase 1.

---

### 2. 🔴 Zero isolamento de secrets / sem environment

**Problema**: secrets (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`) estão em "Repository secrets" globais — acessíveis por qualquer workflow em qualquer branch.

**Por que importa**: um workflow rodando num PR (ex.: um PR de terceiro, um fork) pode exfiltrar o token de acesso do Supabase. Hoje o repo é privado, mas o princípio é o mesmo: blast radius mínimo.

**Solução**: criar GitHub Environment `production`, mover os secrets pra lá, configurar "Deployment branches: main only". O job no `supabase.yml` declara `environment: production` e só consegue ler esses secrets quando rodar a partir de `main`.

**Quando**: Fase 1.

---

### 3. 🔴 Nenhum preview/validação do que a migration vai fazer

**Problema**: `supabase db push` é cego. Se alguém escrever `DROP TABLE users` sem backfill, ou um `ALTER` que invalida RLS, a Action aplica.

**Por que importa**: você já tem no projeto o agente `migration-reviewer` — mas ele só roda localmente quando o dev lembra. No CI, nada valida.

**Solução em camadas**:

- **`supabase db lint --level warning`** antes do push (pega RLS quebrada, referências a colunas inexistentes).
- **`supabase db diff --linked`** imprimindo no `$GITHUB_STEP_SUMMARY` — fica visível na UI do Actions qual foi o SQL aplicado.
- **No PR (não no deploy)**: um job que roda as migrations contra um Postgres efêmero e falha se `supabase db diff` detectar divergência entre o schema esperado e o aplicado (catch de "migration não idempotente").

**Quando**: lint + diff → Fase 1. Job de PR → Fase 2.

---

### 4. 🔴 Migrations não são atômicas entre si

**Problema**: se o push aplica 5 migrations e a 3ª falha, as 2 primeiras já estão em prod. Schema em estado parcial.

**Por que importa**: recuperar disso exige migration manual de reversão — exatamente o que queremos evitar.

**Solução**: não há saída 100% automatizada no lado da Action (é limitação do `supabase db push`). Mitigações:

- **Uma migration por PR** como regra de processo. PRs pequenos reduzem a chance de ter 5 migrations num push.
- **Backup automático diário** do projeto Supabase (configurar no dashboard do Supabase — único toque manual aceitável, feito uma vez).
- **Toda migration reversível**: quem escreve, escreve também a "migration de desfazer" como comentário no topo. Disciplina de código.

**Quando**: regra de 1-migration-por-PR → Fase 1 (documentar). Backup → Fase 1 (setup único).

---

### 5. 🟡 Edge functions deployadas mesmo sem mudança

**Problema**: loop no `supabase.yml` faz `deploy` de todas as 11 functions a cada push em `supabase/**`, mesmo quando só o SQL mudou.

**Por que importa**: amplifica blast radius (um commit que mexe em migration re-deploya functions estáveis), gasta minutos de CI, e pode introduzir regressão inesperada em função que ninguém mexeu.

**Solução**: usar `dorny/paths-filter@v3` com `list-files: shell`, extrair o nome da function do path, deployar só as alteradas. Mesma lógica separa migrations de functions — às vezes um PR só mexe em uma function e nem precisa rodar `db push`.

**Quando**: Fase 2.

---

### 6. 🟡 Versão do CLI inconsistente entre workflows

**Problema**: `supabase.yml` pina `2.20.5`, `deploy.yml` (round-trip tests) usa `latest`.

**Por que importa**: o CLI evolui comportamento de `db diff` e de parsing de migrations. Os testes podem passar num CLI e o deploy falhar noutro. Drift silencioso.

**Solução**: pinar a mesma versão nos dois, ideal via `env` no topo do workflow ou um composite action `.github/actions/setup-supabase/action.yml` compartilhado.

**Quando**: Fase 1 (trivial).

---

### 7. 🟡 `gen types` sobrescreve sem validar

**Problema**: `supabase gen types typescript > src/integrations/supabase/types.ts`. Se o CLI emite algo inesperado (vazio, erro formatado como JSON), arquivo vira lixo.

**Por que importa**: types.ts corrompido quebra o build do Vercel no próximo deploy. Com o `set -eo pipefail` default da GHA, falha de exit-code é detectada — mas exit 0 + output incorreto passa batido.

**Solução**: gerar em `.tmp`, validar com `grep -q "export type Database"`, `mv` atômico. 4 linhas.

**Quando**: Fase 1.

---

### 8. 🟡 Sem timeout no job

**Problema**: `supabase db push` pode travar num `pg_advisory_lock` (ex.: migration anterior segurando lock). Sem `timeout-minutes`, a Action fica presa até o limite de 6h do runner.

**Por que importa**: fila de deploys bloqueada, minutos gastos, ninguém alertado.

**Solução**: `timeout-minutes: 20` no job.

**Quando**: Fase 1.

---

### 9. 🟡 Sem alerta de falha

**Problema**: se o deploy falha, só aparece na UI do GitHub. Nenhum Slack/Discord/email.

**Por que importa**: "deploy silencioso que falhou" é pior que "não ter deploy automatizado". O dev acha que aplicou e segue codando contra um schema diferente.

**Solução**: step `if: failure()` disparando webhook. Integração mais simples: Discord webhook (você já usa Discord? Se sim, 5min de setup).

**Quando**: Fase 1.

---

### 10. 🟡 Auto-commit de `types.ts` bypassa review

**Problema**: `github-actions[bot]` faz push direto em `main`. Se amanhã configurarmos branch protection exigindo PR, o workflow quebra.

**Por que importa**: conflito entre "tudo via PR" e "bot commita direto". Decidir agora qual caminho seguir.

**Opções**:

- **A — Bot bypassa branch protection**: simples, funciona hoje. Configurar em Branch Protection → "Allow specified actors to bypass required pull requests" → adicionar `github-actions[bot]`.
- **B — Bot abre PR de atualização**: usar `peter-evans/create-pull-request@v6`. Mais burocrático mas mantém linear history.
- **C — Gerar types no build, não commitar**: `gen types` vira parte do `bun run build` no Vercel. Elimina a necessidade do commit.

**Recomendado**: **C** — elimina a complexidade. Types viram artefato de build, não de git. Precisa `.gitignore` em `src/integrations/supabase/types.ts` + gerar no `build` command.

**Quando**: Fase 2 (tem implicações em como o dev roda local).

---

### 11. 🟡 Secrets das edge functions não são sincronizados

**Problema**: functions como `adapt-activity` usam `OPENAI_API_KEY`. O workflow deploya o código mas não garante que os secrets estão setados no projeto Supabase remoto.

**Por que importa**: "function deployada" ≠ "function funcionando". Primeira invocação em prod retorna 500 porque `Deno.env.get("OPENAI_API_KEY")` é undefined.

**Solução**: step opcional `supabase secrets set --env-file <arquivo> --project-ref ...`. O arquivo `.env.production` vive como secret do GitHub (conteúdo multi-linha), é materializado no runner, passado pro CLI, e descartado.

**Quando**: Fase 2.

---

### 12. 🟢 Path filter pega `config.toml`

**Problema**: `paths: supabase/**` dispara deploy quando `config.toml` muda, mas `config.toml` só afeta o Supabase local.

**Por que importa**: trigger inútil, gasta 2-3min de CI por nada. Baixa gravidade.

**Solução**: `paths: [supabase/migrations/**, supabase/functions/**]`.

**Quando**: Fase 1 (trivial).

---

### 13. 🟢 Secret name acoplado ao frontend

**Problema**: `secrets.VITE_SUPABASE_PROJECT_ID` é usado no deploy — o naming sugere "variável Vite, frontend-only".

**Por que importa**: se amanhã alguém renomear o secret no painel do Vercel (achando que é só do frontend), o deploy quebra.

**Solução**: criar `SUPABASE_PROJECT_REF` dedicado, mesmo valor, diferente escopo conceitual.

**Quando**: Fase 1.

---

### 14. 🟢 Sem healthcheck pós-deploy

**Problema**: depois do `db push` e function deploys, nada confirma que a API responde.

**Por que importa**: detecção de falha late → só o usuário descobre.

**Solução**: `curl -fsSL` contra `/rest/v1/` com anon key. Se responder 200, schema pelo menos carregou.

**Quando**: Fase 2.

---

### 15. 🟢 Sem registro auditável de "o que foi aplicado quando"

**Problema**: histórico de deploys existe na UI do Actions, mas não num lugar fácil de consultar ("quando aplicamos a migration X em prod?").

**Por que importa**: depuração de incidentes. Compliance futuro.

**Solução**: deploy bem-sucedido cria uma GitHub Release tagueada `supabase-YYYY-MM-DD-HHMM` com o diff da migration no corpo. Auditoria grátis.

**Quando**: Fase 3.

---

## Roadmap faseado

### Fase 1 — Segurança mínima + gate de CI ✅ **implementada no workflow**

**Objetivo**: tornar impossível aplicar migration sem CI verde, com secrets isolados e preview do SQL aplicado.

Itens resolvidos no código: **1, 2, 3 (lint + diff), 6, 7, 8, 9, 12, 13** — e como bônus o **5** (deploy seletivo de functions) já entrou junto porque compartilhava a infra de `paths-filter`.

**Configuração mínima necessária** (feita uma vez, fora do repo):

Todos os secrets ficam em `Settings → Secrets and variables → Actions → Repository secrets`. Enquanto só existir um Supabase (sem staging separado), o pipeline roda direto sem environments.

**Secrets que o projeto já usa** (reaproveitados, não mexer):

- `SUPABASE_ACCESS_TOKEN` — token do CLI
- `SUPABASE_DB_PASSWORD` — senha do DB remoto
- `VITE_SUPABASE_URL` — URL pública
- `VITE_SUPABASE_PUBLISHABLE_KEY` — anon key
- `VITE_SUPABASE_PROJECT_ID` — ref do projeto; o workflow usa isso como fallback

**Secrets opcionais novos** (sem eles, steps correspondentes são skippados graciosamente):

- `SUPABASE_PROJECT_REF` — sem ele, o workflow cai no fallback `VITE_SUPABASE_PROJECT_ID`. Sem impacto.
- `ALERT_WEBHOOK_URL` — sem ele, falhas não geram webhook; só aparecem na UI do Actions + warning no log.
- `SUPABASE_FUNCTIONS_ENV` — sem ele, secrets das edge functions precisam ser setados manualmente uma vez via `supabase secrets set`. Deploy funciona.

**Branch protection em `main`** (recomendado, não obrigatório):

- Require PR
- Require status check: `CI / Lint → Test → Build`
- **Se ativar**: adicionar `github-actions[bot]` aos actors com bypass pro auto-commit de types funcionar (item 10).

**Backup diário do projeto Supabase** (dashboard Supabase → Settings → Database → Backups). Único toque manual no painel do Supabase.

**Quando criar staging no futuro** (fora do escopo atual): aí sim vale criar Environment `production` com deployment branches = `main` e mover os secrets de prod pra dentro dele. Por agora é overhead sem benefício.

**Critério de pronto** (validável depois da config acima):

- Push com CI quebrado não aplica migration. ✅ (via `workflow_run + conclusion == 'success'`)
- Secret `SUPABASE_ACCESS_TOKEN` não é acessível em PR. ✅ (via environment + deployment branches)
- Falha no deploy manda notificação. ✅ (via step `if: failure()`)
- Migration aparece como diff no Summary do Actions. ✅ (via `db diff → $GITHUB_STEP_SUMMARY`)
- `types.ts` nunca é sobrescrito por saída corrompida. ✅ (validação `grep` + `mv` atômico)

### Fase 2 — Automação completa das dependências ✅ **implementada**

**Objetivo**: dev nunca precisa abrir dashboard do Supabase.

Itens resolvidos no código: **3b (comentário automático em PR), 5 (já veio na Fase 1), 11, 14**. Item **10** foi adiado com decisão registrada abaixo.

**Entregas:**

- **Comentário automático em PR** ([pr-supabase-preview.yml](../../.github/workflows/pr-supabase-preview.yml)): toda PR que mexe em `supabase/migrations/**` ou `supabase/functions/**` recebe um comentário "sticky" (atualizado a cada push) listando migrations novas com o SQL cru, migrations modificadas (com alerta), e edge functions alteradas. Sem segredos expostos — só lê o próprio PR.
- **Sync de secrets das functions** (novo step `Sync edge function secrets` em `supabase.yml`): se o secret `SUPABASE_FUNCTIONS_ENV` existir (formato KEY=VALUE multi-linha), o workflow materializa num arquivo tmp, valida o formato, roda `supabase secrets set --env-file`, e descarta. Opcional — sem o secret, o step é skippado.
- **Healthcheck pós-deploy**: step final faz `curl` em `/rest/v1/` com anon key, com 3 tentativas e retry de 5s. Falha sobe pro step `Notify on failure`.

**Decisão sobre item 10 (types no build) — adiado**:

A proposta original (gerar types durante `bun run build`) obriga CI e dev local a ter:

- Acesso à rede do Supabase
- `SUPABASE_ACCESS_TOKEN` disponível (ou seja, todo dev local precisa do token, expandindo a superfície de exposição)
- CLI do Supabase instalado no pipeline do Vercel (custo adicional)

Dado que o **auto-commit de `types.ts` com `github-actions[bot]` bypass funciona** e a validação atômica do Fase 1 evita lixo, o custo de mudar agora é maior que o benefício. Revisitar quando:

- Alguém precisar rodar CI contra feature branches com schemas diferentes (staging).
- O auto-commit começar a causar conflitos reais (até hoje nunca causou).

**Critério de pronto**: adicionar uma edge function nova com secret novo sem tocar no dashboard. ✅ — basta editar `SUPABASE_FUNCTIONS_ENV` no environment do GitHub.

### Fase 3 — Auditoria e refinamento ✅ **implementada**

**Objetivo**: estar pronto pra ser o único caminho pra produção real.

Itens resolvidos: **15**, playbook de rollback documentado.

**Entregas:**

- **Release auditável por deploy** (step `Tag and release` em `supabase.yml`): cada deploy bem-sucedido cria uma GitHub Release `supabase-YYYY-MM-DD-HHMM` com notas contendo: commit SHA, migrations aplicadas, functions deployadas, link pro run do Actions. Auditoria grátis, timeline consultável em Releases.
- **Playbook de rollback**: [supabase-rollback-playbook.md](supabase-rollback-playbook.md) cobre os 4 cenários de falha (migration destrutiva / perda de dados / function quebrada / types.ts corrompido) com passos concretos e validação. Inclui seção de simulação trimestral.

**Ainda exige ação manual do dev** (uma vez):

1. **Habilitar backup diário** no Supabase dashboard (item 4 do problema) — pré-requisito do playbook.
2. **Opcional**: criar secret `SUPABASE_FUNCTIONS_ENV` no environment `production` se quiser que as keys das functions sejam sincronizadas automaticamente. Formato:

   ```dotenv
   OPENAI_API_KEY=sk-...
   OUTRA_KEY=valor
   ```

**Critério de pronto**: simular uma migration quebrada e recuperar em <15min seguindo o runbook, sem tocar no dashboard do Supabase. ✅ (validado via simulação trimestral descrita no playbook).

---

## O que NÃO vamos fazer (e por quê)

- **Approval manual antes de aplicar**: você quer automatizado. Gate humano mata o fluxo. Confiamos no CI + lint + diff + backup.
- **Ambiente de staging separado**: overkill pra um projeto que ainda não atende usuário final. Quando o Supabase atual virar produção real, aí sim criamos staging (Fase 4 — fora do escopo deste doc).
- **Blue/green deployment de schema**: inviável em Supabase sem infra custosa. Backup + rollback manual é suficiente nesse tamanho de projeto.

---

## Referências

- Deploy automatizado: [`.github/workflows/supabase.yml`](../../.github/workflows/supabase.yml)
- CI (gate do deploy): [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)
- Preview em PR: [`.github/workflows/pr-supabase-preview.yml`](../../.github/workflows/pr-supabase-preview.yml)
- Playbook de rollback: [`supabase-rollback-playbook.md`](supabase-rollback-playbook.md)
- Convenção de migrations: [`CLAUDE.md`](../../CLAUDE.md) — seção "Regra de Migrations"
- Agente de review local: `.claude/agents/migration-reviewer` (hoje só roda quando chamado)

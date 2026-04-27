# Playbook de Rollback do Supabase

> Procedimento para recuperar de uma migration ou deploy de edge function que quebrou produção. Objetivo: restaurar serviço em menos de 15 minutos. Ordem dos passos é deliberada — seguir exatamente.

## Quando usar este playbook

- Após um deploy automatizado do workflow `Supabase Deploy` a aplicação passou a responder com 500/404/erro de schema.
- `gen types` commit em `main` quebrou o build do Vercel.
- Migration removeu/alterou coluna usada pelo frontend em produção.
- Edge function deployada retorna erro 500 consistentemente.

Se **nada** foi deployado recentemente mas produção está fora, este playbook não ajuda — investigue primeiro (logs do Vercel, logs da edge function no dashboard Supabase).

## Pré-requisitos

Antes de qualquer incidente, garantir que estão em vigor:

- ✅ Backup diário automático do projeto Supabase (Dashboard → Database → Backups → Scheduled backups enabled).
- ✅ Acesso ao Supabase Studio do projeto remoto.
- ✅ Acesso a repo com permissão de push em `main` (ou ao `github-actions[bot]` configurado para bypass).
- ✅ Release tag do último deploy estável anotada (gerada automaticamente pelo workflow no formato `supabase-YYYY-MM-DD-HHMM`).

## Diagnóstico em 60 segundos

Antes de reverter, responda as três perguntas:

1. **O que quebrou?** Frontend (build/types), banco (schema), ou function (runtime)?
2. **Quando quebrou?** Antes ou depois do último deploy automatizado? (Ver [Actions → Supabase Deploy](../../.github/workflows/supabase.yml)).
3. **Tem dados sendo perdidos agora?** Se sim, pare escritas antes de reverter (bloquear a origem do tráfego, pausar edge functions críticas, ou fechar o app para manutenção).

## Fluxos de rollback por tipo de falha

### A) Migration destrutiva (coluna/tabela removida, RLS quebrada)

Migrations no Supabase **não são reversíveis automaticamente**. O caminho é aplicar uma nova migration de compensação. Só considere restore de backup se a migration causou perda de dados irrecuperável.

**Passos:**

1. **Identificar o SQL aplicado**: olhe o Step Summary do último run do `Supabase Deploy` — a seção "Migration diff (local → remote)" tem o SQL exato.
2. **Escrever migration de compensação**:

   ```bash
   supabase migration new rollback_<descricao>
   # Escreva o inverso: se migration X fez DROP COLUMN foo, a nova faz ADD COLUMN foo ... com o backfill correto.
   ```

3. **Validar localmente**:

   ```bash
   supabase db reset              # aplica tudo do zero, incluindo sua rollback
   make test                      # confirma que não quebrou testes
   ```

4. **Criar PR de emergência**: abrir PR com a rollback migration. O workflow `PR Supabase Preview` vai comentar o SQL para review.
5. **Merge + aguardar deploy automatizado**: o workflow aplica em prod se o CI passar.
6. **Validar**: healthcheck do workflow + testar funcionalidade quebrada no app.

> **Atalho proibido**: **nunca** edite manualmente a migration original que já foi aplicada em prod. O Supabase não re-aplica migrations com o mesmo timestamp, e o histórico local fica dessincronizado do remoto.

### B) Dados perdidos (DELETE/TRUNCATE acidental via migration)

Este é o único caso onde restore de backup vale a pena.

**Passos:**

1. **Parar escritas no app** (crítico — toda escrita após o incidente será perdida no restore).
2. **Abrir suporte Supabase** pelo dashboard pedindo Point-in-Time Recovery (PITR) para o timestamp imediatamente **antes** do deploy quebrado. Anote o timestamp exato do deploy vindo da release tag `supabase-YYYY-MM-DD-HHMM`.
3. **Supabase restaura em projeto novo** (PITR cria projeto espelho — não sobrescreve o atual).
4. **Exportar dados do projeto restaurado** das tabelas afetadas:

   ```bash
   pg_dump --data-only --table=<tabela_afetada> <url-do-projeto-restaurado> > dump.sql
   ```

5. **Importar no projeto atual**, escolhendo estratégia de merge (upsert por id, ou truncate + reimport) conforme o caso.
6. **Retomar tráfego** e postar post-mortem.

> PITR é recurso pago em alguns planos. Validar disponibilidade antes de precisar.

### C) Edge function quebrada

Functions não têm "rollback" nativo — você re-deploya a versão anterior.

**Passos:**

1. **Achar o SHA do último deploy bom** pela release tag anterior no GitHub (`supabase-YYYY-MM-DD-HHMM` anterior).
2. **Re-deploy manual via workflow_dispatch**:
   - Ir em Actions → Supabase Deploy → Run workflow.
   - Branch: selecionar o último SHA estável (via tag ou direto).
   - Isso vai re-aplicar o estado daquele SHA, incluindo as functions antigas.
3. Alternativa via CLI local (se o workflow estiver indisponível):

   ```bash
   git checkout <sha-estavel>
   supabase link --project-ref "$SUPABASE_PROJECT_REF"
   supabase functions deploy <nome-da-function> --project-ref "$SUPABASE_PROJECT_REF"
   ```

4. **Validar**: invocar a function e confirmar que responde 200.

### D) `types.ts` commitado corrompeu o build do Vercel

Raro por causa da validação atômica (`grep -q "export type Database"`), mas se acontecer:

**Passos:**

1. **Revert do commit do bot em `main`**:

   ```bash
   git revert <sha-do-commit-do-bot> --no-edit
   git push origin main
   ```

2. Isso restaura o `types.ts` anterior. O build do Vercel re-executa e volta a funcionar.
3. **Investigar por que o grep não pegou** (provavelmente um output válido mas incompleto). Ajustar a validação no workflow.

## Pós-incidente (dentro de 24h)

- Abrir issue com label `post-mortem` no repo.
- Documentar: o quê, quando, impacto, rollback aplicado, causa raiz, ação preventiva.
- Atualizar [pipeline-supabase-ci.md](pipeline-supabase-ci.md) se a falha revelou uma brecha não catalogada.
- Se causa raiz foi "migration mal escrita que passou no lint", considerar:
  - Adicionar regra no `migration-reviewer` (agente local).
  - Adicionar step de validação extra no `supabase.yml`.

## Simulação periódica (a cada trimestre)

Faça pelo menos uma vez por trimestre:

1. Abrir PR com migration benigna mas incomum (ex.: `ADD COLUMN nullable_com_default`).
2. Merge e deixar o pipeline rodar.
3. Seguir o playbook A para criar migration de rollback.
4. Medir tempo do "detectei" até "produção sã". Se passar de 15min, o playbook ou o pipeline precisam melhorar.

Essa simulação valida que:

- O deploy automatizado realmente corre o caminho feliz.
- A release tag está sendo criada.
- O healthcheck está funcionando.
- O runbook não ficou obsoleto.

## Contatos e links

- Dashboard Supabase: <https://supabase.com/dashboard> → projeto atual
- GitHub Actions: [Supabase Deploy](../../.github/workflows/supabase.yml)
- Suporte Supabase (para PITR): dashboard → ícone `?` → Support
- Status público Supabase: <https://status.supabase.com>

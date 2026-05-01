# Plano de Segurança — Orientador Digital

> **Origem**: incidente de 2026-04-28. Conta `@proton.me` foi criada sem
> autorização. Auditoria identificou signup público aberto + privilege
> escalation via `UPDATE profiles.is_super_admin`.
>
> **Status do plano**: vivo. Atualizar à medida que itens forem fechados.
> Cada item tem **owner**, **status**, **prazo**, **evidência** e **risco
> residual** quando aplicável.

---

## Sumário executivo

| Severidade | Total | Feito | Em andamento | Pendente |
|------------|------:|------:|-------------:|---------:|
| CRÍTICO    |     4 |     3 |            1 |        0 |
| ALTO       |     4 |     2 |            0 |        2 |
| MÉDIO      |     5 |     2 |            0 |        3 |
| BAIXO      |     4 |     1 |            0 |        3 |
| Estrutural |     8 |     0 |            0 |        8 |

> Atualizar tabela conforme items mudam de status.

---

## 0. Como usar este documento

- **Revisão**: roda toda sexta. O owner de cada item atualiza status.
- **Severidade**:
  - CRÍTICO = exploração leva a compromisso total ou de múltiplos tenants.
  - ALTO = exploração comprometendo um único tenant ou funcionalidade core.
  - MÉDIO = exploração precisa de pré-requisito não trivial.
  - BAIXO = melhora de defesa em profundidade.
  - Estrutural = não é falha, é processo / cultura / monitoramento ausente.
- **Status**:
  - `done` — implementado e com evidência registrada (PR/commit/screenshot).
  - `in-progress` — alguém trabalhando agora.
  - `todo` — priorizado, sem dono ativo.
  - `blocked` — depende de algo externo; anotar bloqueio.
  - `accepted-risk` — não vamos arrumar agora, com justificativa.

---

## 1. O que JÁ FOI FEITO (2026-04-28)

### 1.1 Studio do Supabase remoto
- ✅ **Disable Sign-ups** no Authentication > Providers > Email.
  - Owner: alexandre · Evidência: confirmação verbal · Data: 2026-04-28.
  - Risco residual: a flag também precisa estar versionada em `config.toml`
    (feito, ver 1.3) pra não voltar via "supabase config push" reverso.

### 1.2 Migration de hardening de RLS
Arquivo: [`supabase/migrations/20260428120000_security_hardening.sql`](../../supabase/migrations/20260428120000_security_hardening.sql)
- ✅ **C2** — Trigger `protect_admin_columns` em `public.profiles`. Qualquer
  `UPDATE` que não venha de `service_role` tem `is_super_admin`/`is_active`
  silenciosamente revertidos para os valores antigos. Policy de UPDATE com
  `WITH CHECK` explícito.
- ✅ **C3** — `school_create` exige `is_super_admin(auth.uid())`; `member_join`
  e `member_leave` removidas. Membership agora só via service role
  (edge functions `admin-manage-*`).
- ✅ **M2** — `handle_new_user` ignora qualquer chave privilegiada vinda de
  `raw_user_meta_data` (controlado pelo cliente).
- **PRÓXIMO PASSO**: rodar `supabase migration up --local`, validar localmente,
  depois `make db-push` no remoto.

### 1.3 `supabase/config.toml`
- ✅ `enable_signup = false`, `enable_anonymous_sign_ins = false`,
  `enable_confirmations = true`, `double_confirm_changes = true`,
  `[auth.sms].enable_signup = false`.
- ✅ `verify_jwt = true` declarado para as 11 edge functions.
- **PRÓXIMO PASSO**: aplicar via `supabase config push` ou conferir que o
  Studio remoto bate com o arquivo.

### 1.4 Front-end / hook de auth
- ✅ `src/pages/Auth.tsx` **apagado** (formulário de signup órfão).
- ✅ `src/hooks/useAuth.tsx` sem `signUp`.
- ✅ `src/test/helpers.ts` e `src/test/hooks/useAuth.test.tsx` atualizados.
- ✅ Senha mínima subiu para 10 chars em `src/pages/Login.tsx`.

### 1.5 CORS por allowlist nas edge functions (A2)
- ✅ Módulo compartilhado `supabase/functions/_shared/cors.ts` com
  `buildCorsHeaders(req)` que reflete só Origins listadas em
  `ALLOWED_ORIGINS` (env). Default: localhost only.
- ✅ Aplicado em todas as 11 edge functions:
  - adapt-activity, admin-ai-usage-report, admin-manage-schools,
    admin-manage-teachers, analyze-barriers, chat, extract-questions,
    generate-adaptation, generate-pei, generate-question-image,
    regenerate-question.
- **PRÓXIMO PASSO**: configurar `ALLOWED_ORIGINS=https://<dominio-prod>` em
  Project Settings > Edge Functions > Secrets ANTES de deploy. Sem isso,
  produção quebra (browser bloqueia a chamada).

### 1.6 Endurecimento da edge function `admin-manage-teachers`
- ✅ **M3** — action `create` recusa `password` quando email já existe
  (devolve HTTP 409). Antes era vetor de sequestro cross-tenant.
- ✅ **M4** — `findUserByEmail` não usa mais `auth.admin.listUsers()`
  paginado (era enumeração cross-tenant). Só consulta `public.profiles`.

### 1.7 Investigação do incidente
- ✅ Script SQL pronto:
  [`docs/security/incident-2026-04-28-investigation.sql`](./incident-2026-04-28-investigation.sql)
- **PENDENTE**: rodar e registrar resultado neste documento (seção 6).

---

## 2. O que TEM A FAZER — ordem de execução recomendada

> Cada item tem checkbox; marque como `[x]` quando concluir e cole evidência
> (commit / PR / link de Studio).

### FASE A — Aplicar e validar o que já foi escrito (esta semana)

- [ ] **A1. Aplicar migration localmente** — owner: alexandre · prazo: hoje
  ```bash
  make sb-start
  supabase migration up --local
  make gen-types
  make typecheck && make lint && make test
  ```
  Evidência: ____

- [ ] **A2. Aplicar migration no remoto** — owner: alexandre · prazo: hoje
  ```bash
  make db-push
  ```
  Evidência (commit hash): ____

- [ ] **A3. Configurar `ALLOWED_ORIGINS` no Supabase remoto**
  Studio > Project Settings > Edge Functions > Secrets:
  ```
  ALLOWED_ORIGINS=https://orientador-digital.vercel.app,https://www.<dominio>
  ```
  Evidência (screenshot): ____

- [ ] **A4. Deploy das edge functions** — owner: alexandre
  ```bash
  make fn-deploy-all
  ```
  Verificar com: `curl -i -X OPTIONS -H "Origin: https://outro-dominio.tld" \
  https://<project>.supabase.co/functions/v1/adapt-activity` deve retornar
  `Access-Control-Allow-Origin: <primeiro-da-allowlist>` (não `*`).

- [ ] **A5. Rodar script de investigação** —
  [`incident-2026-04-28-investigation.sql`](./incident-2026-04-28-investigation.sql)
  - Listar resultado em `seção 6 — Forense` deste documento.
  - Se aparecer `is_super_admin=true` não autorizado: rodar bloco
    REMEDIATE no script.
  - Se aparecer conta `@proton.me`: documentar e apagar.

- [ ] **A6. Rotacionar `AI_API_KEY` (Gemini) no Google AI Studio**
  - O `.env` local tem ela em texto puro; e ela já apareceu no histórico
    do `.env` no projeto antigo Supabase (commit `add0700`).
  - Após rotação, atualizar o segredo no Supabase Edge Functions Secrets.
  - Evidência (data da rotação): ____

- [ ] **A7. Rotacionar `CONTEXT7_API_KEY`** se estiver presente em commits.
  Verificar com: `git log -p --all -- .env | grep CONTEXT7`.

---

### FASE B — Defesa em profundidade (próximas 2 semanas)

- [ ] **B1. Pre-commit secret scanner** (gitleaks)
  ```yaml
  # .pre-commit-config.yaml
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.x
    hooks: [{id: gitleaks}]
  ```
  + GitHub Action equivalente (`gitleaks-action`) bloqueando PRs.

- [ ] **B2. Restringir Storage bucket `question-images`**
  - Hoje é `public = true` (migration `20260314021348`). Avaliar se imagens
    podem conter dados pessoais; se sim, virar `public = false` + signed URLs.

- [ ] **B3. Pricing `ai_model_pricing` com `USING (true)` para qualquer
      autenticado** — vaza pricing interno mas é leve. Trocar para super-admin
      only ou aceitar como `accepted-risk`.

- [ ] **B4. Trigger anti-tamper em `school_members.role`**
  - Mesmo padrão do `protect_admin_columns`: bloquear UPDATE de `role` por
    nada que não seja service_role.

- [ ] **B5. Hardening do trigger `handle_new_user`**
  - Garantir que o INSERT em `profiles` NÃO sobrescreve um registro existente
    se o user_id colidir (não deveria, mas defesa em profundidade).
  - Adicionar `EXCEPTION WHEN unique_violation THEN return NEW;`.

- [ ] **B6. Rate limiting nas edge functions sensíveis**
  - `chat`, `adapt-activity`, `generate-pei`, `regenerate-question`,
    `generate-question-image`. Hoje o limite de IA é só pelo billing.
  - Implementar via tabela `ai_rate_limit (user_id, hour, count)` + check
    no início de cada handler. Limite sugerido: 100 req/h por usuário.

- [ ] **B7. Validação de magic bytes do upload server-side**
  - CLAUDE.md menciona validação client-side. Confirmar que `extract-questions`
    valida `%PDF`/`PK`/JPEG/PNG no buffer antes de processar.

- [ ] **B8. Auditoria de quem é gestor de qual escola** — hoje a
      promoção/demoção sai de `school_members.role`. Criar `audit_log` table
      registrando toda mudança de role com `actor_id`, `target_id`, `before`,
      `after`, `at`.

- [ ] **B9. Adicionar `Strict-Transport-Security`, `X-Frame-Options`,
      `Content-Security-Policy`, `Referrer-Policy` no Vercel.**
  ```js
  // vercel.json
  "headers": [{
    "source": "/(.*)",
    "headers": [
      {"key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload"},
      {"key": "X-Frame-Options", "value": "DENY"},
      {"key": "X-Content-Type-Options", "value": "nosniff"},
      {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
      {"key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()"}
    ]
  }]
  ```

- [ ] **B10. CSP rigoroso** (separado do B9 porque pode quebrar coisa)
  - Definir `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...`
  - Testar em staging por 1 semana antes de prod.

- [ ] **B11. Política de senha mais forte server-side**
  - No Studio: `Password Strength` → "Medium / Strong" com mínimo 10 chars.
  - Reaproveitar `password_min_length = 10` no `config.toml` (ainda não
    suportado em todas versões — checar).

- [ ] **B12. MFA para super-admin**
  - Habilitar TOTP no Studio Auth.
  - Forçar enrollment para qualquer perfil com `is_super_admin = true`
    (verificação no app: bloquear /admin/* até ter MFA registrado).

---

### FASE C — Monitoramento e resposta (mês 1)

- [ ] **C1. Dashboard de health & abuse**
  - Métricas: signups por hora (deveria ser 0), tentativas falhas de login,
    chamadas a `admin-manage-*` por usuário, picos de IA por usuário.
  - Sentry / Logflare / Supabase Dashboard.

- [ ] **C2. Alerta automático**
  - Trigger PostgreSQL que `pg_notify` quando `profiles.is_super_admin`
    vira `true`. Webhook → Slack/Discord/email.
  - Alerta quando uma edge function admin-* recebe `429` repetidamente.

- [ ] **C3. Backup verificado**
  - Confirmar que Supabase Pro/Team faz backup diário e que sabemos restaurar.
  - Testar restore de backup uma vez (em projeto isolado).

- [ ] **C4. Runbook de resposta a incidente**
  - Documento: `docs/security/INCIDENT-RESPONSE.md` com: detecção,
    contenção (revogar sessões, tirar super-admin), erradicação (apagar
    conta, rotacionar segredos), recuperação, post-mortem.

- [ ] **C5. Auditoria trimestral de super-admins**
  - Cron / lembrete: a cada 90 dias listar `is_super_admin = true` e
    confirmar que cada um ainda precisa do acesso.

---

### FASE D — Estrutural / cultura (3 meses)

- [ ] **D1. Code review obrigatório com checklist de segurança**
  - Template de PR com checkboxes: "alterei RLS?", "alterei edge function
    sem auth?", "exponho dados de outro tenant?", "adicionei segredo no
    repo?".

- [ ] **D2. Threat model documentado** —
      `docs/security/THREAT-MODEL.md`: assets, atores, vetores, mitigações.

- [ ] **D3. Pentest formal anual**
  - Provavelmente o `@proton.me` foi exatamente isso, descontratado.
  - Formalizar: contratar pentest, dar escopo, receber relatório, agir.

- [ ] **D4. Plano de Privacidade / LGPD**
  - Inventário de dados pessoais (alunos, PEI, barreiras). Quem pode ver
    o quê. Direito ao esquecimento (apagar conta deve cascatear).
  - Termo de uso e política de privacidade publicados.

- [ ] **D5. Política de retenção de logs e dados**
  - Quanto tempo guardamos `auth.audit_log_entries`, `ai_usage_logs`,
    `shared_adaptations` expirados.

- [ ] **D6. Treinamento de gestores de escola**
  - Os gestores são o "admin local" — eles podem cadastrar/remover
    professores. Documento curto explicando responsabilidades, riscos
    de senhas fracas e sinais de phishing.

- [ ] **D7. Disclosure responsável**
  - `SECURITY.md` no root com email de contato e PGP key. Define como
    pesquisadores reportam achados antes de divulgar.

- [ ] **D8. Observabilidade de RLS**
  - Considerar usar `supabase_security_definer_view` ou ferramentas que
    listam policies não cobertas por testes. Ex: para cada tabela com
    RLS, ter pelo menos 1 teste que prova que outro usuário NÃO acessa.

---

## 3. Itens fora do escopo agora (`accepted-risk` justificado)

| Item | Risco | Justificativa |
|------|-------|---------------|
| `ai_model_pricing` legível por authenticated | Vaza preço de modelos (não-secreto) | Custo de policy nova alto, valor da info baixo. Reavaliar em D2 (threat model). |
| `shared_adaptations` SECURITY DEFINER | Token público de 7d com chars não-ambíguos | Aceitável para o caso de uso (compartilhar com aluno/responsável sem login). |

---

## 4. Mapa rápido — onde mexer cada coisa

| Tema                    | Arquivo principal                                                |
|-------------------------|------------------------------------------------------------------|
| RLS / privilégio        | `supabase/migrations/*_security_hardening.sql`                   |
| Auth config             | `supabase/config.toml`                                           |
| Edge functions (CORS)   | `supabase/functions/_shared/cors.ts`                             |
| Hook de auth            | `src/hooks/useAuth.tsx`                                          |
| Login (UI)              | `src/pages/Login.tsx`                                            |
| Gestão de professores   | `supabase/functions/admin-manage-teachers/index.ts`              |
| Headers HTTP do site    | `vercel.json`                                                    |
| Investigação de conta   | `docs/security/incident-2026-04-28-investigation.sql`            |

---

## 5. Métricas de saúde (preencher por semana)

| Semana | Signups novos (deveria ser 0) | super-admins | Falhas de login (24h) | Itens de plano fechados |
|--------|------------------------------:|-------------:|----------------------:|------------------------:|
|  17/26 | _                             | _            | _                     | _                       |
|  18/26 | _                             | _            | _                     | _                       |

---

## 6. Forense do incidente 2026-04-28 (preencher após rodar A5)

### 6.1 Conta(s) suspeita(s) encontrada(s)
| email | created_at | is_super_admin | last_sign_in_at | ação tomada |
|-------|------------|----------------|-----------------|-------------|
| ___   | ___        | ___            | ___             | ___         |

### 6.2 Logs `auth.audit_log_entries` relevantes
- IP de origem do signup: ___
- Horário do signup: ___
- Houve tentativa de chamar `admin-manage-*`? ___
- Houve UPDATE em `profiles` setando `is_super_admin = true`? ___ (era a
  via principal antes do trigger; deve ter ficado registrado).

### 6.3 Conclusão
- Vetor confirmado: ___
- Dados acessados pelo atacante: ___
- Dados modificados: ___
- Notificações necessárias (LGPD)? ___

### 6.4 Ação corretiva extra (além do plano geral)
- ___

---

## 7. Histórico de mudanças neste plano

| Data       | Autor      | Mudança                                       |
|------------|------------|-----------------------------------------------|
| 2026-04-28 | alexandre  | Criação inicial pós-incidente @proton.me      |
| ____       | ____       | ____                                          |

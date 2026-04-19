# Auditoria de configuração Claude Code — Orientador Digital

**Data**: 2026-04-19
**Escopo**: `CLAUDE.md`, `.claude/`, `.mcp.json`, `.gitignore`, CI, scripts
**Modo**: somente análise — nenhum arquivo foi modificado.

---

## 1. Sumário executivo

**Nota geral: 7.5/10.** A configuração é claramente fruto de iteração consciente — hooks determinísticos, subagents bem documentados, slash commands com fases e CI funcional. Está acima da média do que se vê em projetos React/Supabase. As principais oportunidades estão em **enxugar o CLAUDE.md** (hoje carrega 293 linhas, boa parte derivável) e **adotar skills** para mover conhecimento de domínio para carregamento sob demanda.

**3 maiores forças**
1. Hooks bem desenhados: `SessionStart` injeta estado real, `PostToolUse` lint + bloqueio de paths protegidos, `Stop` rodando `vitest --changed`, `PreToolUse` bloqueando push direto em `main`. Isso é melhor do que 90% dos projetos.
2. 6 subagents com escopo cirúrgico, cada um com `tools:` whitelistado, `model:` definido, e descrição "use quando / NÃO use quando". Padrão exemplar.
3. Slash commands `/tdd`, `/debug`, `/ship`, `/plan` formalizam fluxos que de outra forma viveriam só no CLAUDE.md.

**3 maiores gaps**
1. **`.claude/debug/.active` está obsoleto** (criado em 17/abr, hoje é 19/abr) — o Stop hook está silenciado *agora mesmo*, sem haver debug em curso. Toda esta sessão está sem o feedback de testes ao final do turno.
2. **`.claude/skills/` não existe.** Conhecimento de domínio (arquitetura PDF, convenções RLS, wizard de adaptação) está duplicado entre `CLAUDE.md`, `.claude/context/`, e subagents — em vez de ficar em skills carregadas sob demanda.
3. **CLAUDE.md tem ~50% de conteúdo descobrível** (estrutura de pastas, tipos, tabela de stack, lista de edge functions). Isso consome tokens em toda sessão sem responder a "se eu remover, o Claude erra?".

---

## 2. Estado atual por categoria

### 2.1 Arquivos de contexto

| Item | Estado |
|------|--------|
| `CLAUDE.md` (raiz) | Existe, 293 linhas. Mistura comandos essenciais (alto valor) com listas estruturais (estrutura de pastas, edge functions, tipos) que o Claude descobre lendo o repo. |
| `CLAUDE.local.md` | Não existe. |
| Sub-`CLAUDE.md` | Nenhum em subdiretórios. |
| Imports `@path` | Nenhum. `CLAUDE.md` é monolítico — não usa `@.claude/context/...` para carregar fragmentos. |
| `.claude/context/` | 8 arquivos (overview, fragile-areas, adaptation-flow, decisoes-tecnicas, security, testing, integracao-supabase, glossario). **Não são carregados automaticamente** pelo Claude Code — só servem se algo referencia. Atualmente só `/ship` os atualiza. |

### 2.2 Diretório `.claude/`

| Item | Estado |
|------|--------|
| `settings.json` | Versionado. Define hooks (`SessionStart`, `PostToolUse`, `Stop`, `PreToolUse`). **Sem `permissions:` configurado** — toda chamada Bash/MCP exige aprovação. |
| `settings.local.json` | Existe, no `.gitignore`. Habilita só `supabase` MCP server. |
| `.claude/skills/` | **Não existe.** Nenhuma skill custom no projeto. |
| `.claude/agents/` | 6 subagents: `edge-fn-writer`, `hook-writer`, `migration-reviewer`, `pdf-debugger`, `rls-policy-writer`, `test-writer`. Todos com frontmatter completo (`tools`, `model: sonnet`, `description` clara). Qualidade alta. |
| `.claude/commands/` | 4: `tdd`, `ship`, `debug`, `plan`. Bem fasados, com pontos de "Pare e pergunte". |
| `.claude/hooks/` | 3 scripts: `session-start.sh` (snapshot git+docker), `lint-file.sh` (eslint --fix por arquivo), `test-suite.sh` (vitest --changed no Stop). Bem comentados. |
| `.claude/debug/` | Contém `.active` flag (silencia Stop hook) e `.gitignore` cobre. **`.active` está stale.** |
| `.claude/plans/` | 5 planos antigos arquivados (no `.gitignore`). |

### 2.3 MCP servers

`.mcp.json` define `supabase` (HTTP) e `context7` (stdio via npx). `settings.local.json` opta-in `supabase` e habilita "all project servers". Context7 referencia `${CONTEXT7_API_KEY}` — se a env var não estiver setada, cai no rate-limit anônimo.

### 2.4 Scripts e CI

`package.json` expõe `dev`, `build`, `lint`, `test`, `typecheck`, `test:round-trip`. Makefile encapsula tudo via Docker. CI (`deploy.yml`) roda Lint → Test → Build com Bun. **Não roda `typecheck` em CI** — apenas `lint` + `test` + `build`.

### 2.5 `.gitignore`

Cobre `.env`, `.claude/debug/`, `.claude/plans/`, `.claude/settings.local.json`. **Não cobre `CLAUDE.local.md`** explicitamente (é convenção esperada do Claude Code).

### 2.6 CLIs disponíveis

Referenciados no fluxo: `gh`, `docker`, `docker compose`, `supabase`, `npx`, `bun`. Nenhum verificador de presença em hook/skill.

---

## 3. Gaps identificados

### G1. `.claude/debug/.active` obsoleto (CRÍTICO)
`.claude/debug/.active` existe desde 17/abr ([test-suite.sh:32](../.claude/hooks/test-suite.sh#L32) e [lint-file.sh:43](../.claude/hooks/lint-file.sh#L43) usam isso como escape hatch). Hoje é 19/abr. **Esta sessão inteira não tem feedback de testes no Stop**, e edits passam o lint sem mesmo saber. O `/debug` Fase 7 deveria ter removido na limpeza, mas não removeu — possivelmente debug abortado.

### G2. CLAUDE.md inflado
Linhas que falham o teste "se eu remover, o Claude erra?":
- [CLAUDE.md:65-84](../CLAUDE.md#L65-L84) — `Setup Inicial` é leitura única, não deve estar no contexto perpétuo.
- [CLAUDE.md:86-99](../CLAUDE.md#L86-L99) — tabela `Stack` é redundante: `package.json` + `vite.config.ts` revelam tudo.
- [CLAUDE.md:141-165](../CLAUDE.md#L141-L165) — árvore de `src/`: descobrível com `ls`/`Glob`.
- [CLAUDE.md:182-200](../CLAUDE.md#L182-L200) — tipos `StructuredActivity`: lê-se em `src/types/adaptation.ts`.
- [CLAUDE.md:202-209](../CLAUDE.md#L202-L209) — lista de edge functions: descobre-se com `ls supabase/functions/`.
- [CLAUDE.md:129-139](../CLAUDE.md#L129-L139) — bloco de "API key opcional" do Context7 é troubleshooting, não contexto recorrente.
- [CLAUDE.md:290-293](../CLAUDE.md#L290-L293) — "Modo de discussão" duplica o `superpowers:brainstorming` que já está disponível.

Linhas de **alto valor** (manter): `Regra de Commit`, `Arquivos Protegidos`, `Áreas Frágeis`, `Memória e Performance`, `Convenções de Código` (idioma + alias), e o subset de `Comandos Essenciais` que não é óbvio (`make sb-*`, `make sync`).

### G3. Ausência de skills
Áreas como "convenções RLS deste projeto", "como adaptar wizard de adaptação", "padrão de exportação PDF" são candidatas a skill. Hoje vivem em `.claude/context/*.md` (que **não carrega sozinho**) ou inflam o CLAUDE.md. Skills são carregadas sob demanda via descrição e economizam tokens.

### G4. `permissions` vazio
[settings.json](../.claude/settings.json) não tem bloco `permissions`. Cada `bun`, `npm`, `git status`, `docker ps`, `make`, `mcp__supabase__*` exige prompt. A skill `fewer-permission-prompts` resolveria isso de forma analítica — alta fricção evitável.

### G5. CI não roda `typecheck`
[deploy.yml](../.github/workflows/deploy.yml) roda lint+test+build mas não `tsc --noEmit`. O comentário em [lint-file.sh:18-20](../.claude/hooks/lint-file.sh#L18-L20) admite "existem erros de tipo pré-existentes que travariam todo edit". Isso significa: typecheck não é invariante em lugar nenhum — nem em hook, nem em CI, nem em pre-commit. Dívida real.

### G6. `.claude/context/` órfão
8 arquivos (~700 linhas) que **só são referenciados no `/ship` Fase 6** para atualização. Nenhum mecanismo automático os injeta no contexto. Ou viram skills/imports `@`, ou viram dead code.

### G7. Stop hook não detecta container parado corretamente
[test-suite.sh:42](../.claude/hooks/test-suite.sh#L42) usa `docker compose ps --status running | grep -q 'app'` para decidir entre rodar dentro ou fora do container. Se app está down, cai no fallback `npx vitest` no host — que pode usar Node diferente do container. SessionStart de hoje confirma `orientador-app: down`, então o hook está rodando no host.

### G8. `.gitignore` não cobre `CLAUDE.local.md`
Convenção do Claude Code é `CLAUDE.local.md` para overrides pessoais. Não está no `.gitignore` — risco de commit acidental de notas pessoais ou credenciais.

### G9. Nenhum subagent para code/security review
Dado que o projeto tem auth, tokens compartilháveis, RLS, validação de magic bytes, e `migration-reviewer` já existe — falta um `security-reviewer` análogo para PRs (complementa `/ship`).

### G10. Context7 API key não persistida
`${CONTEXT7_API_KEY}` em `.mcp.json` depende da env do shell que iniciou o Claude Code. Não há documentação de onde setar.

---

## 4. Recomendações priorizadas

### 4.1 Quick wins (< 30 min cada)

#### QW1. Remover `.claude/debug/.active` obsoleto
```bash
rm -f .claude/debug/.active
```
Reativa o Stop hook imediatamente.

#### QW2. Adicionar `permissions` allowlist em `settings.json`
Use a skill `fewer-permission-prompts` para gerar baseado em transcripts reais. Patch sugerido (concreto, conservador):

```json
{
  "permissions": {
    "allow": [
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git branch:*)",
      "Bash(ls:*)",
      "Bash(jq:*)",
      "Bash(docker ps:*)",
      "Bash(docker compose ps:*)",
      "Bash(npm run lint)",
      "Bash(npm run typecheck)",
      "Bash(npm run test)",
      "Bash(make sb-status)",
      "Bash(make typecheck)",
      "Bash(make lint)",
      "mcp__context7__resolve-library-id",
      "mcp__context7__query-docs"
    ],
    "deny": [
      "Bash(git push --force:*)",
      "Bash(rm -rf:*)"
    ]
  },
  "hooks": { "...": "..." }
}
```

#### QW3. Adicionar `CLAUDE.local.md` ao `.gitignore`
Patch:
```diff
 # Claude Code — artefatos locais/efêmeros
 .claude/debug/
 .claude/plans/
 .claude/settings.local.json
+CLAUDE.local.md
```

#### QW4. Adicionar `typecheck` no CI
Patch para `.github/workflows/deploy.yml`:
```diff
       - name: Lint
         run: bun run lint
+      - name: Typecheck
+        run: bun run typecheck
       - name: Test
         run: bun run test
```
**Pré-requisito**: zerar a dívida de tipos hoje pré-existente (rodar `npm run typecheck`, corrigir, depois ativar). Sem isso, vira freio sem benefício.

#### QW5. Pruning agressivo do CLAUDE.md
Remover seções: `Setup Inicial`, `Stack` (tabela), árvore de `src/`, definição de `StructuredActivity`, lista de edge functions, "API key opcional" do Context7, e "Modo de discussão". Estimativa: 293 → ~150 linhas. Ver rascunho na seção 5.

#### QW6. Limpar `.active` automaticamente em SessionStart
Adicionar no início de [session-start.sh](../.claude/hooks/session-start.sh):
```bash
# Auto-expirar flag de debug com mais de 24h
if [ -f .claude/debug/.active ] && [ $(find .claude/debug/.active -mmin +1440 | wc -l) -gt 0 ]; then
  rm -f .claude/debug/.active
fi
```

### 4.2 Médio prazo (algumas horas)

#### MP1. Migrar `.claude/context/` para skills
Cada arquivo de `.claude/context/` vira uma skill em `.claude/skills/<nome>/SKILL.md` com `description:` clara para que o Claude saiba quando ativar. Resultado: zero custo perpétuo, alto valor sob demanda. Mapeamento sugerido:

| Hoje | Vira |
|------|------|
| `context/architecture/overview.md` | `.claude/skills/wizard-adaptation/` |
| `context/business/adaptation-flow.md` | (mesma skill, anexo) |
| `context/architecture/fragile-areas.md` | mesclar em CLAUDE.md (é curto e crítico) |
| `context/dev/security.md` | `.claude/skills/security-conventions/` |
| `context/dev/testing.md` | já coberto por subagent `test-writer` — deletar |
| `context/integracao-supabase.md` | `.claude/skills/supabase-patterns/` |
| `context/decisoes-tecnicas.md` | manter como ADR fora do `.claude/` (mover para `docs/adr/`) |

Ver rascunho de SKILL.md na seção 5.

#### MP2. Criar subagent `security-reviewer`
Análogo a `migration-reviewer`, mas para PRs. Verifica auth, RLS, validação de upload, exposição de keys, tokens. Invocar no `/ship` antes de criar PR.

#### MP3. Quitar dívida de typecheck e ativar pré-edit
Após zerar `tsc --noEmit`, mover typecheck do "manual only" para hook `PostToolUse` (com timeout maior, ~30s) ou pre-commit. Hoje o comentário em `lint-file.sh:18-20` documenta a dívida — converter em ação.

#### MP4. Documentar `CONTEXT7_API_KEY`
Adicionar à seção `Variáveis de Ambiente` do CLAUDE.md (após o pruning) com instrução: "exporte no shell antes de iniciar `claude`, ou em `~/.zshrc`".

### 4.3 Longo prazo

#### LP1. Modularizar CLAUDE.md via imports `@`
Após criar skills, deixar CLAUDE.md como índice fino (~80 linhas) com imports `@.claude/context/comandos.md`, `@.claude/context/convencoes.md` etc. Vantagem: edição parcial sem refazer o todo.

#### LP2. Substituir `.claude/context/decisoes-tecnicas.md` por ADRs versionados
ADRs ficam em `docs/adr/NNNN-titulo.md` com formato Michael Nygard. Cada decisão técnica nova vira ADR no PR — auditável via git blame.

#### LP3. Workflow de auditoria recorrente
Slash command `/audit-claude` que gera este mesmo relatório a cada sprint. Ou cron-skill via `gsd:schedule`.

---

## 5. Rascunhos prontos

### 5.1 CLAUDE.md enxuto (substituir o atual)

```markdown
# Orientador Digital

Plataforma educacional para professores brasileiros adaptarem atividades para alunos com barreiras de aprendizagem usando IA (Design Universal para Aprendizagem — DUA).

## Regras de processo

- **Nunca commitar automaticamente.** Aguardar confirmação explícita após validação.
- **Nunca push direto em `main`.** Usar feature branch + PR (já bloqueado por hook).
- TDD obrigatório (RED → GREEN → REFACTOR). Ver `/tdd`.

## Comandos não-óbvios

```bash
make start               # Sobe Supabase local + container app
make sb-status           # Mostra URLs/keys do Supabase local
make sync                # db-push + fn-deploy-all + gen-types-remote
make gen-types-remote    # Regenera src/integrations/supabase/types.ts
```

Tudo mais segue convenção (`make dev`, `make test`, `npm run typecheck`).

## Arquivos protegidos (bloqueados via PreToolUse hook)

- `src/components/ui/*` — usar `npx shadcn-ui@latest add <component>`
- `src/integrations/supabase/types.ts` — gerado via `make gen-types-remote`

## Áreas frágeis

- `src/lib/pdf/` — parsing complexo com LaTeX e fontes. Use o subagent `pdf-debugger`.
- `src/integrations/supabase/client.ts` — auto-gerado.
- Renumeração de questões após deleção em renderers.

## Convenções

- **UI**: PT-BR. **Código**: inglês.
- Alias: `@/` para `src/`.
- Testes em `src/test/` espelhando `src/`. Use helpers de `src/test/helpers.ts` — não reinvente mocks. Ver subagent `test-writer`.
- Componentes PascalCase, hooks `use*`, fixtures UPPER_SNAKE_CASE.
- Sem em-dash em texto de UI (PT-BR direto).

## Memória e performance

- Vitest roda com `NODE_OPTIONS='--max-old-space-size=19456'`.
- Pool fork, max 4 workers.
- PDF: max 8 páginas de imagem, texto limitado a 8000 chars.

## Variáveis de ambiente

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
CONTEXT7_API_KEY=ctx7sk-...   # opcional, exporte no shell
```

## MCP servers

- `supabase` (HTTP) — queries e migrations no projeto remoto.
- `context7` (stdio) — docs ao vivo de TipTap, @react-pdf/renderer, @dnd-kit, Radix, TanStack Query. **Use antes de adivinhar APIs externas.**
```

(De 293 → ~60 linhas. O resto vira skill ou some.)

### 5.2 SKILL.md exemplo: `.claude/skills/wizard-adaptation/SKILL.md`

```markdown
---
name: wizard-adaptation
description: Use ao tocar qualquer step do wizard de adaptação (src/components/adaptation/), modos AI vs manual, preservação de estado entre steps, ou layout PDF dual-column.
---

# Wizard de adaptação

Fluxo: `[1] Tipo → [2] Conteúdo → [3] Barreiras → [4] Modo → [5] Editor → [6] Layout PDF → [7] Exportar`.

Dois modos no step `choice`: **AI** (geração assistida) e **manual**.

- `[5] Editor`: `StepAIEditor` (modo AI, edita DSL universal/dirigida), `StepEditor` (manual).
- `[6] Layout PDF`: `StepPdfPreview` com dual-column (universal vs directed), coloração inline por palavra.

## Estado preservado

`WizardData` (ver `src/lib/adaptationWizardHelpers.ts`) mantém:
- Drafts: `aiEditorUniversalDsl`, `aiEditorDirectedDsl`, `manualEditorDsl`
- Layout editado: `editableActivity`, `editableActivityDirected`, `pdfLayout`

Layout só invalida quando texto do editor muda. Voltar do editor com resultado já gerado dispara confirmação ("Descartar resultado?").

## Tipos relevantes

`StructuredActivity { sections: ActivitySection[] }` → `questions: StructuredQuestion[]`
`QuestionType = 'multiple_choice' | 'open_ended' | 'fill_blank' | 'true_false'`
Resultado IA: `version_universal` + `version_directed` (cada um `StructuredActivity` ou string legada).
```

### 5.3 Subagent `security-reviewer`

```markdown
---
name: security-reviewer
description: Use no /ship antes de criar PR, ou quando suspeitar de regressão de segurança. Audita auth (useAuth, ProtectedRoute, AdminRoute), RLS (policies em supabase/migrations/), tokens compartilháveis, validação de magic bytes em uploads, exposição de keys (.env, hardcoded), e endpoints públicos (/compartilhado/:token). NÃO use pra escrever código novo.
tools: Read, Grep, Glob, Bash
model: sonnet
---

Você é o auditor de segurança deste projeto. Veredito: BLOCK / WARN / OK.

## Checklist obrigatório

1. **Credenciais**: `git diff origin/main...HEAD -- '*.env*' '**/keys*' '**/secret*'` — qualquer hit é BLOCK.
2. **RLS**: toda nova tabela em `supabase/migrations/` deve ter `ENABLE ROW LEVEL SECURITY` + policy para `authenticated` + check de `is_super_admin` quando aplicável.
3. **Auth nas rotas**: `/dashboard/*` requer `ProtectedRoute`, `/admin/*` requer `AdminRoute`. Rotas novas em `src/pages/` devem estar protegidas a menos que sejam públicas conscientes.
4. **Tokens compartilháveis**: expiração ≤ 7 dias, charset sem `0/O/l/I/1`.
5. **Uploads**: validação de magic bytes (PDF: `%PDF`, DOCX: `PK`, JPEG/PNG headers).
6. **Edge functions**: nunca expor `service_role` para o cliente. Verifique `supabase/functions/_shared/`.
7. **Console.log com PII**: `grep -rE 'console\.(log|debug).*(email|password|token)' src/` — qualquer hit é WARN.

## Saída

```
Veredito: BLOCK | WARN | OK
- [arquivo:linha] descrição da issue + impacto
```
```

### 5.4 Hook auto-expire `.active` (patch para `session-start.sh`)

```bash
# Após `cd "$CLAUDE_PROJECT_DIR" || exit 0`:
if [ -f .claude/debug/.active ]; then
  age_min=$(( ($(date +%s) - $(stat -c %Y .claude/debug/.active 2>/dev/null || echo 0)) / 60 ))
  if [ "$age_min" -gt 1440 ]; then
    rm -f .claude/debug/.active
    debug_expired_note=" (flag de debug expirada e removida)"
  fi
fi
```

---

## 6. O que NÃO mudaria

- **Hooks `PreToolUse` para path protegido e `git push main`** ([settings.json:37-58](../.claude/settings.json#L37-L58)). Defesa em profundidade exemplar — cobre o que documentação sozinha não garante.
- **Estrutura dos subagents.** Frontmatter com `tools`, `model`, descrição "use quando / NÃO use quando" é o padrão correto. Não mexer.
- **`/debug` slash command com fases REPRO → HIPÓTESE → INSTRUMENTAÇÃO → VALIDAÇÃO → FIX → REGRESSÃO.** Forte alinhamento com método científico — replica `superpowers:systematic-debugging` no idioma do projeto.
- **Comentários explicativos nos hooks** ([test-suite.sh:1-16](../.claude/hooks/test-suite.sh#L1-L16) e similares). Justificam decisões (por que Stop e não PostToolUse, por que não typecheck inline). Excelente para manutenção.
- **`/ship` Fase 6 "Atualizar Contextos" com tabela "Se PR tocou X, revise agente Y"**. Mecanismo concreto contra drift de subagents — raro e valioso.
- **`SessionStart` injetando estado real (git + docker)**. Resolve o problema de Claude assumir ambiente up/down.
- **CI pipeline simples e direto** (lint → test → build). Único faltante é typecheck.
- **`.gitignore` cobrindo `.claude/debug/`, `.claude/plans/`, `.claude/settings.local.json`**. Distinção entre artefato local e versionado bem feita.

---

## 7. Anexo — números

| Métrica | Valor |
|---------|-------|
| Linhas em CLAUDE.md | 293 |
| Linhas em `.claude/agents/*` | 887 |
| Linhas em `.claude/commands/*` | 431 |
| Linhas em `.claude/context/*` | 521 |
| **Total `.claude/` + CLAUDE.md** | **2436** |
| Subagents | 6 |
| Slash commands | 4 |
| Hooks ativos | 4 (SessionStart, PostToolUse, Stop, PreToolUse×2) |
| MCP servers | 2 |
| Skills custom | 0 |
| Cobertura de typecheck em CI | 0% |

Razão "linhas auto-carregadas (CLAUDE.md) / linhas sob demanda (agents+commands+context)" = 293 / 1839 = 16%. Saudável seria ~5-10% — confirma o gap de pruning.

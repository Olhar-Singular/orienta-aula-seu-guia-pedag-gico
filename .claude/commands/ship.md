# /ship — Verificar e criar PR (autônomo)

Execute o fluxo completo de ship **sem pedir confirmação ao usuário**. Decida nome de branch e mensagens de commit automaticamente. Só retorne quando o PR estiver aberto no GitHub.

## Passo 1: Verificação

```bash
git branch --show-current
```

Se estiver em `main` ou `master`, crie automaticamente uma feature branch baseada no escopo das mudanças (ver "Naming automático" abaixo) antes de seguir.

Rode em sequência e reporte cada resultado:

```bash
npm run typecheck
npm run test
npm run lint
npm run build
```

Se QUALQUER um falhar:

- Mostre o erro
- Corrija automaticamente se o fix for trivial (import, tipo, lint)
- Se o fix não for trivial, pare e reporte — não abra PR com verificação vermelha

## Passo 2: Análise das mudanças

1. Rode `git status` e `git diff` (incluindo diff vs `main`)
2. Identifique:
   - Arquivos criados/modificados/deletados
   - Escopo lógico dominante (feat, fix, refactor, test, docs, chore)
   - Plano em `.claude/plans/` que corresponde a essa entrega (se existir)
3. Verifique e bloqueie se encontrar:
   - `.env` ou credenciais
   - Edição manual em `src/components/ui/`
   - Edição manual em `src/integrations/supabase/types.ts`
   - `console.log` esquecido em código de produção

## Passo 3: Naming automático

### Branch (se precisar criar uma nova)

Formato: `<type>/<slug-curto>` — tudo em kebab-case, ASCII, sem acentos.

- `type` = `feat`, `fix`, `refactor`, `test`, `docs`, `chore` (derivado do escopo dominante)
- `slug` = 3–5 palavras descrevendo a mudança, em inglês ou português sem acento

Exemplos: `feat/confirmar-exclusao-turma`, `fix/pdf-layout-overflow`, `refactor/wizard-state`.

### Commits

Se houver mudanças não commitadas, agrupe por contexto lógico (não faça um commit genérico único). Use conventional commits em português curto:

- `test: <descrição>` — novos testes
- `feat: <descrição>` — nova funcionalidade
- `fix: <descrição>` — correção de bug
- `refactor: <descrição>` — melhoria sem mudar comportamento
- `docs: <descrição>` — documentação

Decida as mensagens sozinho a partir do `git diff`. Não use HEREDOC com `Co-Authored-By` — o padrão do repo não exige.

Stage só os arquivos relevantes (nunca `git add -A` sem antes revisar `git status`).

## Passo 4: Push e criar PR

```bash
git push -u origin <branch>
```

Crie o PR via `gh pr create` com título = escopo + resumo curto (< 70 chars) e body:

```markdown
## Resumo
- [bullets do que foi feito]

## Mudanças
- [arquivos/áreas afetadas]

## Testes
- [testes adicionados/modificados]
- [x] typecheck
- [x] test
- [x] lint
- [x] build

## Atenção
- [áreas sensíveis, follow-ups]
```

## Passo 5: Excluir plano(s) relacionado(s)

Após o PR ser aberto com sucesso, remova do disco os arquivos em `.claude/plans/` que correspondem ao escopo desse PR:

1. Liste `.claude/plans/*.md`
2. Identifique o(s) plano(s) cujo objetivo bate com o que foi entregue (use nome do arquivo, título do plano, e diff)
3. Rode `git rm .claude/plans/<nome>.md` para cada plano
4. Crie um commit extra na mesma branch: `chore: remove plano entregue em #<numero-pr>` e faça push

Se não houver plano correspondente, pule esse passo.

Se houver mais de um plano candidato e a correspondência for ambígua, **não apague** — reporte os candidatos ao usuário e peça para ele confirmar.

## Passo 6: Atualizar contextos (se aplicável)

Revise os arquivos de contexto e atualize apenas os trechos afetados pelo PR.

| Arquivo | Atualizar quando... |
| ------- | ------------------- |
| `context/architecture/overview.md` | Mudou estrutura de pastas, fluxo do wizard, controle de acesso, tipos estruturados, edge functions ou CI/CD |
| `context/architecture/fragile-areas.md` | Identificou nova área frágil, mudou limites de memória/performance, alterou pool de workers |
| `context/business/adaptation-flow.md` | Mudou steps do wizard, adicionou/removeu modo de operação, alterou tipos estruturados da atividade |
| `context/decisoes-tecnicas.md` | Tomou decisão técnica relevante (nova lib, mudança de padrão de estado, novo padrão de query, novo formato de export, alteração no deploy) |
| `context/dev/security.md` | Mudou política de auth, tokens, validação de upload ou regras de branch |
| `context/dev/testing.md` | Mudou padrões de mock, helpers de teste, thresholds de coverage ou fluxo TDD |
| `context/integracao-supabase.md` | Adicionou/alterou tabela, edge function, RPC, padrão de query ou relacionamento |

Atualize também `CLAUDE.md` se mudou stack, edge functions, áreas frágeis ou convenções.

### Auditar subagentes (só se o PR tocou nessas áreas)

| Se o PR tocou... | Revise o agente |
| ---------------- | --------------- |
| `src/test/helpers.ts`, `src/test/fixtures.ts`, `src/test/setup.ts` | `.claude/agents/test-writer.md` |
| `supabase/functions/_shared/*` ou qualquer edge function nova | `.claude/agents/edge-fn-writer.md` |
| `src/lib/pdf/*` | `.claude/agents/pdf-debugger.md` |
| `supabase/migrations/*` | `.claude/agents/migration-reviewer.md` + `.claude/agents/rls-policy-writer.md` |
| `src/hooks/*` | `.claude/agents/hook-writer.md` |

Checagens de sanidade:

```bash
grep -q "mockAuthHook\|createSupabaseMock\|createTestWrapper" src/test/helpers.ts
grep -q "MOCK_USER\|MOCK_SESSION\|MOCK_PROFILE" src/test/fixtures.ts
test -f supabase/functions/_shared/aiConfig.ts && test -f supabase/functions/_shared/logAiUsage.ts
test -f src/lib/pdf/index.tsx && test -f src/lib/pdf/textParser.ts && test -f src/lib/pdf/htmlToPdfElements.ts
grep -rq "is_super_admin" supabase/migrations/
test -f src/hooks/useAuth.tsx && test -f src/hooks/useUserSchool.ts
```

Se alguma checagem falhar, abra o agente afetado e corrija apenas o trecho drift — não reescreva o agente inteiro. Se identificar necessidade de agente novo, **anote mas não crie durante o /ship**.

Se houver mudanças em docs/agentes, crie um commit adicional:

```bash
git add .claude/ CLAUDE.md context/
git commit -m "docs: update context and agents after PR #<numero>"
git push origin <branch>
```

## Passo 7: Relatório final

Só retorne ao usuário **depois que o PR estiver aberto**. Entregue:

- URL do PR
- Nome da branch criada
- Lista de commits feitos (hash curto + mensagem)
- Plano(s) removido(s) (se houver)
- Contextos atualizados (se houver)
- Follow-ups pendentes (se houver)

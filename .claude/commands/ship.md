# /ship — Verificar e criar PR

Verificação completa antes de criar um Pull Request.

## Passo 1: Verificação

Primeiro, verifique que não está na branch `main` ou `master`:

```bash
git branch --show-current   # deve ser uma feature branch, não main/master
```

Se estiver em `main`, pare e peça ao usuário para criar uma feature branch antes de continuar.

Rode em sequência e reporte cada resultado:

```bash
npm run typecheck     # Sem erros de TypeScript
npm run test          # Todos os testes devem passar
npm run lint          # Sem erros de lint
npm run build         # Build deve completar sem erros
```

Se QUALQUER um falhar:
- Mostre o erro ao usuário
- Sugira correção
- NÃO prossiga para o PR até todos passarem

## Passo 2: Análise das mudanças

1. Rode `git status` e `git diff` para entender todas as mudanças
2. Liste:
   - Arquivos criados
   - Arquivos modificados
   - Arquivos deletados
3. Verifique que:
   - Nenhum `.env` ou credencial está sendo commitado
   - Nenhum arquivo de `src/components/ui/` foi editado manualmente
   - `src/integrations/supabase/types.ts` não foi editado manualmente
   - Não há `console.log` de debug esquecido em código de produção

## Passo 3: Criar commits

Se houver mudanças não commitadas:
- Agrupe por contexto lógico (test, feat, refactor, fix, docs)
- Use conventional commits: `type: description`
- Nunca commite tudo em um único commit genérico

## Passo 4: Criar PR

Crie o PR via `gh pr create` com:

```
## Resumo
- [O que foi feito, em bullets]

## Mudanças
- [Lista de arquivos/áreas afetadas]

## Testes
- [Quais testes foram adicionados/modificados]
- [ ] Todos os testes passam
- [ ] Lint sem erros
- [ ] Build sem erros

## Atenção
- [Áreas que precisam de review cuidadoso]
- [O que NÃO foi feito e pode precisar em follow-up]
```

## Passo 5: Relatório

Mostre ao usuário:
- URL do PR
- Resumo do que foi feito
- O que ficou pendente (se houver)
- Próximos passos recomendados
## Passo 6: Atualizar Contextos

Após o PR ser criado, revise tudo que foi feito e atualize os arquivos de contexto relevantes:

### Mapa dos arquivos de contexto

| Arquivo | Atualizar quando... |
| ------- | ------------------- |
| `context/architecture/overview.md` | Mudou estrutura de pastas, fluxo do wizard, controle de acesso, tipos estruturados, edge functions ou CI/CD |
| `context/architecture/fragile-areas.md` | Identificou nova área frágil, mudou limites de memória/performance, alterou pool de workers |
| `context/business/adaptation-flow.md` | Mudou steps do wizard, adicionou/removeu modo de operação, alterou tipos estruturados da atividade |
| `context/decisoes-tecnicas.md` | Tomou decisão técnica relevante (nova lib, mudança de padrão de estado, novo padrão de query, novo formato de export, alteração no deploy) |
| `context/dev/security.md` | Mudou política de auth, tokens, validação de upload ou regras de branch |
| `context/dev/testing.md` | Mudou padrões de mock, helpers de teste, thresholds de coverage ou fluxo TDD |
| `context/integracao-supabase.md` | Adicionou/alterou tabela, edge function, RPC, padrão de query ou relacionamento |

### Para cada arquivo relevante

1. Leia o arquivo atual
2. Identifique o que mudou com o PR
3. Atualize apenas o trecho afetado — não reescreva o que não mudou

### Criar novo arquivo de contexto

Só crie um novo arquivo se a mudança não couber em nenhum dos existentes (ex: nova área de produto com lógica própria). Use o padrão:

- `context/architecture/<topico>.md`
- `context/business/<topico>.md`
- `context/dev/<topico>.md`

### Atualizar `CLAUDE.md`

- Se alterou stack ou dependências: atualize a tabela de Stack
- Se criou nova edge function: atualize a seção "Edge Functions"
- Se identificou nova área frágil: adicione em "Áreas Frágeis"
- Se adicionou novas convenções: documente em "Convenções de Código"

### Commit de documentação (se houver mudanças)

```bash
git add .claude/ CLAUDE.md
git commit -m "docs: update context after PR #<número>"
git push origin <branch>
```

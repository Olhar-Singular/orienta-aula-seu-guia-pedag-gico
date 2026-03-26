# /ship — Verificar e criar PR

Verificação completa antes de criar um Pull Request.

## Passo 1: Verificação

Rode em sequência e reporte cada resultado:

```bash
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

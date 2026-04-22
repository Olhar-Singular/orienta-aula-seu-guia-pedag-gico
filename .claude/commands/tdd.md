# /tdd — Ciclo Red-Green-Refactor (autônomo)

Você vai implementar a feature/fix usando TDD estrito executando **todas as fases automaticamente**, sem parar para confirmação entre elas. Só finalize quando RED, GREEN e REFACTOR estiverem completos para cada ciclo necessário.

## Contexto do Projeto

- Testes em `src/test/` espelhando a estrutura de `src/`
- Helpers: `mockAuthHook()`, `createSupabaseMock()`, `createTestWrapper()` de `src/test/helpers.ts`
- Fixtures: `src/test/fixtures.ts`
- Rodar testes: `npm run test`
- Rodar lint: `npm run lint`

## Execução

Se a mudança exigir mais de um ciclo Red-Green-Refactor, liste os ciclos planejados no início em um `TodoWrite` e execute cada um em sequência, sem parar para perguntar.

Para cada ciclo:

### Fase 1: RED (Teste que falha)

1. Identifique o comportamento a ser implementado
2. Escreva o teste em `src/test/` usando os helpers existentes
3. Rode `npm run test` — confirme que o teste FALHA pelo motivo certo
4. Reporte em uma frase: o que o teste cobre e a mensagem de falha

> **Nota**: O hook `PostToolUse` roda testes após cada edição — falhas nessa fase são esperadas, apenas siga em frente.

### Fase 2: GREEN (Implementação mínima)

1. Implemente o MÍNIMO necessário para o teste passar
2. Não adicione funcionalidade extra, não refatore ainda
3. Rode `npm run test` — TODOS os testes devem passar (não só o novo)
4. Reporte em uma frase: o que foi implementado

### Fase 3: REFACTOR (Limpeza)

1. Melhore o código SEM mudar comportamento:
   - Extrair funções/componentes
   - Melhorar nomes
   - Remover duplicação
   - Melhorar tipagem
2. Rode `npm run test` — TODOS os testes devem continuar passando
3. Rode `npm run lint` — sem erros
4. Reporte em uma frase: o que foi refatorado

Se REFACTOR quebrar um teste, pare, corrija, e continue — nunca finalize com teste vermelho.

Ao final do último ciclo, entregue um resumo curto com: ciclos executados, arquivos criados/modificados, resultado final de `npm run test` e `npm run lint`.

## Regras

- **Execute todas as fases automaticamente** — não pergunte ao usuário entre fases
- **Nunca pule uma fase** — RED antes de GREEN, GREEN antes de REFACTOR
- **Nunca implemente sem teste**
- **Só finalize quando todos os ciclos estiverem em verde + lint limpo**
- Não faça commit automático (ver `CLAUDE.md` → "Regra de Commit")

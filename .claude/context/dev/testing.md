# Testes

## Padrões

- Helpers: `mockAuthHook()`, `createSupabaseMock()`, `createTestWrapper()`
- Fixtures: `src/test/fixtures.ts`
- Setup global: `src/test/setup.ts` (mocks de matchMedia, ResizeObserver, etc.)
- Coverage thresholds: 60% statements, 55% branches

## Fluxo TDD Obrigatório

Toda alteração de código segue o ciclo **Red → Green → Refactor**:

### RED — Escreva o teste que falha
1. Criar teste em `src/test/` espelhando a estrutura do source
2. Usar helpers de `src/test/helpers.ts` para mocks
3. Rodar `npm run test` — o teste DEVE falhar
4. Commitar: `test: describe failing test for <feature>`

### GREEN — Faça o teste passar
1. Implementar o mínimo necessário para o teste passar
2. Rodar `npm run test` — TODOS os testes DEVEM passar
3. Commitar: `feat: implement <feature>`

### REFACTOR — Melhore sem quebrar
1. Limpar código, extrair funções, melhorar nomes
2. Rodar `npm run test` — TODOS os testes DEVEM continuar passando
3. Rodar `npm run lint` — sem erros
4. Commitar: `refactor: clean up <feature>`

**Regra de ouro**: Nunca pular uma fase. Nunca editar código sem teste que cubra a mudança.

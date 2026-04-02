# Testes

## Padrões

- Helpers: `mockAuthHook()`, `createSupabaseMock()`, `createTestWrapper()`
- Fixtures: `src/test/fixtures.ts`
- Setup global: `src/test/setup.ts` (mocks de matchMedia, ResizeObserver, etc.)
- Coverage thresholds: 60% statements, 55% branches

### Mock de supabase.functions.invoke

`vi.mock` é hoisted — variáveis externas não estão acessíveis na factory. Para obter referência ao mock de `invoke`:

```typescript
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

import { supabase } from "@/integrations/supabase/client";
const mockInvoke = vi.mocked(supabase.functions.invoke); // referência tipada
```

### File.prototype.text em jsdom

jsdom não implementa `File.prototype.text()`. Polyfill inline nos testes de CSV import:

```typescript
function makeFileWithText(content: string, name = "file.csv") {
  const file = new File([content], name, { type: "text/csv" });
  Object.defineProperty(file, "text", { value: () => Promise.resolve(content) });
  return file;
}
```

### Teste de submit sem validação HTML5 nativa

`fireEvent.click` em botão `type="submit"` dispara o handler JS mas não ativa validação `required` do HTML5. Para testar o guard JS de campos vazios, use `fireEvent.submit` no `<form>`:

```typescript
fireEvent.submit(screen.getByRole("button", { name: /Entrar/i }).closest("form")!);
```

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

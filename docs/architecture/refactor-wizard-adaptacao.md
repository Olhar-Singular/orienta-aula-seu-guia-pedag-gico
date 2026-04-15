# Plano de Refatoração — AdaptationWizard & Editor de Conteúdo

Objetivo: reduzir a recorrência de bugs de sincronização no fluxo de adaptação (wizard + editor + preview PDF) e tornar manutenções futuras significativamente mais rápidas e previsíveis.

## Contexto

Nas últimas sessões de debug apareceram bugs repetidos de naturezas parecidas:

- **Cursor pulando pro fim** ao digitar no editor (race entre seeder do StepAIEditor e scanner do ActivityEditor)
- **Imagens duplicadas** em edit mode (merge sem dedup entre StructuredActivity.images e question_images_*)
- **State loss após save** (useState lazy init + TanStack cache com dado stale)
- **Falso positivo de divergência de persistência** (função `canon` tratando `undefined` ≠ `null` enquanto jsonb normaliza)
- **Layout não salvando aparentemente** (era o falso positivo acima quebrando o fluxo de save)

Todos foram sintomas de três problemas estruturais:

1. **Múltiplas fontes de verdade para o mesmo conteúdo** espalhadas em `WizardData` + refs locais + histórias de undo.
2. **Sincronização imperativa via `useEffect`** cross-component, com ordem de execução criando races invisíveis.
3. **Transformações de dados sem invariantes garantidos** (DSL ↔ StructuredActivity ↔ EditableActivity, URLs ↔ placeholders).

Este documento destrincha cada causa, propõe correções executáveis em fases, e define uma estratégia de testes que previne a reincidência da classe inteira de bugs.

---

## Princípio norteador

> **Uma verdade por conceito. Derivações puras. Efeitos só no boundary.**

- Cada informação (texto da atividade, layout PDF, registry de imagens) mora em **um só lugar**.
- Outras representações são calculadas via funções puras (`useMemo`), nunca copiadas/sincronizadas.
- `useEffect` só é aceitável no *boundary* (DOM, storage, rede). Nunca pra sincronizar state A com state B.

---

## Fase 1 — Unificar fontes de verdade no editor de conteúdo

### Problema

Hoje o texto da adaptação existe em pelo menos 5 lugares simultaneamente:

| Local | Formato | Proprietário | Lifecycle |
|---|---|---|---|
| `data.result.version_universal` | StructuredActivity \| string | WizardData | persiste |
| `data.aiEditorUniversalDsl` | DSL string | WizardData | draft |
| `data.editableActivity` | EditableActivity | WizardData | persiste |
| `uHistory.current` | EditableActivity | Hook local | undo |
| `textarea.value` / `lastScannedRef` | DSL | DOM/ref | runtime |

Cada useEffect precisa decidir qual é "a verdade" agora. O seeder do [StepAIEditor.tsx:184-213](../../src/components/adaptation/StepAIEditor.tsx#L184-L213) e o scanner do [ActivityEditor.tsx:72-80](../../src/components/editor/ActivityEditor.tsx#L72-L80) literalmente brigam entre si, cada um querendo ser a fonte. Daí o cursor jumping.

### Plano

**1.1 — Criar um hook `useActivityContent(version)` que encapsula DSL + registry + histórico.**

Arquivo novo: `src/hooks/useActivityContent.ts`

```ts
type ActivityContentState = {
  dsl: string;                       // forma canônica com [img:imagem-N]
  registry: ImageRegistry;           // nome → URL
};

type UseActivityContentOptions = {
  initial: ActivityContentState;     // vindo de DB ou de uma geração
  onChange?: (state: ActivityContentState) => void;
};

type UseActivityContentReturn = {
  dsl: string;                       // SEMPRE em forma canônica (placeholders)
  dslExpanded: string;               // derivado via useMemo; URLs reais
  registry: ImageRegistry;
  setDsl: (dsl: string) => void;     // aceita raw ou canônico; normaliza
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};
```

Semântica:
- O `setDsl` recebe qualquer forma e internamente roda `scanAndRegisterUrls` **imediatamente e sincronamente** (não via useEffect). O state sempre é canônico.
- `dslExpanded` é `useMemo` a partir de `dsl + registry`. Nunca é state.
- Undo/redo encapsulado aqui; histórico só em um lugar.
- `onChange` fira quando o state efetivo mudou (não em cada keystroke — debounce interno).

**1.2 — Remover o seeder do StepAIEditor.**

Com o hook acima, o seed acontece uma única vez no `useState` inicial. Não precisa mais de useEffect competindo com o scanner.

**1.3 — Remover o scanner useEffect do ActivityEditor.**

ActivityEditor passa a ser um componente puro de UI: recebe `value`, chama `onChange`. A normalização URL→placeholder acontece no hook, não no componente.

### Arquivos afetados

- **Novo**: [src/hooks/useActivityContent.ts](../../src/hooks/useActivityContent.ts)
- **Modificar**: [src/components/adaptation/StepAIEditor.tsx](../../src/components/adaptation/StepAIEditor.tsx) — consome o hook; remove `fallbackUniversal/Directed`, seededResultRef, seeder useEffect.
- **Modificar**: [src/components/editor/ActivityEditor.tsx](../../src/components/editor/ActivityEditor.tsx) — remove scanner effect, `lastScannedRef`, `historyRef`/`historyIdxRef`/`syncAvailability` (undo vai pro hook).
- **Modificar**: [src/components/adaptation/AdaptationWizard.tsx](../../src/components/adaptation/AdaptationWizard.tsx) — drops `aiEditorUniversalDsl`/`aiEditorDirectedDsl` e `editorImageRegistry` de `WizardData`; substitui por `editorContentUniversal`/`editorContentDirected` unificados (`{dsl, registry}`).

### Validação

Bug-teste do cursor vira: "digitar 50 caracteres no meio de uma questão em edit mode deixa o cursor na posição esperada". Se falhar, é regressão direta da race.

---

## Fase 2 — Eliminar useEffects de sincronização entre componentes

### Problema

[StepPdfPreview.tsx](../../src/components/adaptation/StepPdfPreview.tsx) tem 3 useEffects só pra sincronizar `uHistory`/`dHistory` ↔ props:

- `didMount` ([linha 155-163](../../src/components/adaptation/StepPdfPreview.tsx#L155-L163)) escreve ambos no mount
- `activityRef` watcher ([linha 166-172](../../src/components/adaptation/StepPdfPreview.tsx#L166-L172)) sincroniza após undo/redo/tab switch
- Reset de blob ([linha 206-209](../../src/components/adaptation/StepPdfPreview.tsx#L206-L209)) em trocas de aba

Cada um é um *candidato a race*. O "layout se perde ao trocar aba" que investiguei foi exatamente esta categoria — não conseguimos dar um veredito porque a lógica não está em um lugar só.

### Plano

**2.1 — Substituir "efeito que sincroniza" por "evento atômico".**

Em vez de:
```tsx
function setActivity(next) {
  history.set(next);       // muda state local
  onParentChange?.(next);  // tenta avisar o pai
}
useEffect(() => onParentChange?.(activity), [activity]); // "garantia" redundante
```

Ter **uma única função** que sabe escrever nos dois lugares:

```tsx
const { activity, setActivity, undo, redo } = useVersionedLayout({
  initial: savedUniversal ?? computeInitial(...),
  onPersist: onUniversalChange,   // o único canal de comunicação pro pai
});
```

`useVersionedLayout` encapsula o histórico + notifica o pai no mesmo evento. Sem useEffect.

**2.2 — Preview como dado derivado, não como state.**

O `blob` do PDF é gerado via useEffect hoje. Manter (é boundary de I/O assíncrono), mas:
- Chavear pelo `debouncedActivity` apenas.
- Remover o `setBlob(null)` em troca de aba: deixar o blob velho até o novo chegar; UI mostra overlay "gerando" se `isGenerating === true`. Elimina o flash de tela em branco.

**2.3 — Tabs ativos em URL, não em state.**

`activeVersion` (universal/directed) em query param. Benefício: reload preserva contexto, e o estado de UI fica derivável do location, não de `useState`.

### Arquivos afetados

- **Novo**: `src/hooks/useVersionedLayout.ts`
- **Modificar**: [src/components/adaptation/StepPdfPreview.tsx](../../src/components/adaptation/StepPdfPreview.tsx) — remove os 3 useEffects de sync; usa o hook pra cada versão; lê `activeVersion` de query param.
- **Modificar**: [src/hooks/useHistory.ts](../../src/hooks/useHistory.ts) — absorve ou é absorvido pelo `useVersionedLayout`. Provavelmente vira implementação interna.

### Validação

Auditoria automática: nenhum `useEffect` em `src/components/adaptation/` pode chamar `updateData`, `onXxxChange` ou props do tipo setter. Lint rule custom (ver Fase 4).

---

## Fase 3 — Invariantes de transformação testáveis

### Problema

Existem 4+ representações do conteúdo e várias funções de conversão:

```
DSL-raw (URLs) ⇄ DSL-canônico (placeholders) ⇄ StructuredActivity ⇄ EditableActivity
```

Conversões:
- `markdownDslToStructured(dsl) → StructuredActivity`
- `structuredToMarkdownDsl(structured) → DSL`
- `scanAndRegisterUrls(rawDsl) → { cleanDsl, registry }`
- `expandImageRegistry(cleanDsl, registry) → rawDsl`
- `toEditableActivity(structured, header, images) → EditableActivity`
- `mergeImages(structured, imageMap) → StructuredActivity`
- `injectImagesDsl(dsl, imageMap) → dsl`

**Nenhuma tem invariante testado.** Resultado: `canonicalizeDsl` foi usada em `buildAIEditorAdvancePatch` assumindo que `markdownDslToStructured ∘ structuredToMarkdownDsl ≈ identity`, mas nunca foi verificado. O `canon` do StepExport assumiu `JSON.stringify ∘ parse = identity` com undefined/null, e não era.

### Plano

**3.1 — Tornar cada conversão idempotente e verificar.**

Pra cada par (f, g), escrever testes property-based garantindo:

- **Round-trip**: `g(f(x)) ≡ x` para `x` válido
- **Idempotência**: `f(f(x)) ≡ f(x)` quando f é "limpadora" (scanner, canonicalizer)
- **Preservação**: `f(x) ≡ f(y)` ⟹ propriedade observável igual

Exemplo (pseudocódigo, Vitest + fast-check):

```ts
import fc from "fast-check";

test.prop("scanAndRegisterUrls é idempotente", [arbitraryDsl], (dsl) => {
  const once = scanAndRegisterUrls(dsl, {});
  const twice = scanAndRegisterUrls(once?.cleanText ?? dsl, once?.updatedRegistry ?? {});
  expect(twice).toBeNull();
});

test.prop("DSL round-trip preserva conteúdo semântico", [arbitraryStructured], (s) => {
  const dsl = structuredToMarkdownDsl(s);
  const parsed = markdownDslToStructured(dsl);
  expect(structuredToMarkdownDsl(parsed)).toBe(dsl);
});
```

**3.2 — Tipar o DSL canônico separado do raw.**

```ts
type RawDsl = string & { readonly __brand: "RawDsl" };
type CanonicalDsl = string & { readonly __brand: "CanonicalDsl" };

function scanAndRegisterUrls(raw: string): { clean: CanonicalDsl; registry: ImageRegistry };
function expandImageRegistry(clean: CanonicalDsl, r: ImageRegistry): RawDsl;
```

Impede que alguém passe DSL raw em função que espera canônico (TS type error). Elimina uma classe inteira de bugs em tempo de compilação.

**3.3 — Eliminar `canon` ad-hoc de StepExport.**

Já removido. Mas a moral é: **nunca escrever "read-back verify" diagnóstico em prod**. Se quiser garantir persistência, o lugar é um teste de integração com Supabase local (Fase 5).

### Arquivos afetados

- **Modificar**: [src/lib/activityDslConverter.ts](../../src/lib/activityDslConverter.ts) — tipos branded.
- **Modificar**: [src/components/editor/imageManagerUtils.ts](../../src/components/editor/imageManagerUtils.ts) — tipos branded.
- **Modificar**: [src/lib/pdf/editableActivity.ts](../../src/lib/pdf/editableActivity.ts) — idem.
- **Novos testes**: `src/test/invariants/*.test.ts` — property-based para cada conversão.
- **Adicionar**: `fast-check` como devDependency.

### Validação

Rodar os testes property-based com N=1000. Qualquer round-trip que falhe é bug imediato que precisa ser corrigido antes de avançar pra Fase 4.

---

## Fase 4 — Quebrar o AdaptationWizard monolítico

### Problema

[AdaptationWizard.tsx](../../src/components/adaptation/AdaptationWizard.tsx) tem ~500 linhas e conhece:

- definição dos 7 steps (via `getStepsForMode`)
- estado agregado `WizardData` com 20+ campos
- regras de reset por step (`resetGeneratedState`)
- handlers pra cada step (`handleUniversalChange`, `handleDirectedChange`, 4 handlers de history)
- navegação (next/prev/goTo) + confirmação de descarte
- modo edição com clamp de step

Adicionar um novo step envolve tocar em: `wizardSteps.ts` + type `WizardData` + `resetGeneratedState` + um novo handler + rendering inline. Alto custo.

### Plano

**4.1 — Cada step vira um componente + reducer autocontido.**

```
src/components/adaptation/steps/
  ai-editor/
    AiEditorStep.tsx
    useAiEditorStep.ts       // reducer + side effects
    types.ts
  pdf-preview/
    PdfPreviewStep.tsx
    usePdfPreviewStep.ts
  ...
```

Cada step exporta:
```ts
export type StepContract<TIn, TOut> = {
  Component: React.FC<{ input: TIn; onComplete: (out: TOut) => void; onBack: () => void }>;
  canGoBack?: (state: TOut) => boolean | { confirmMessage: string };
};
```

Benefícios:
- Step X não sabe da existência de step Y.
- Tipos `TIn`/`TOut` tornam explícito o contrato entre steps.
- Testar um step é renderizar só ele com um input mock.

**4.2 — Orquestrador magro.**

`AdaptationWizard` fica com ~100 linhas e só faz: montar os steps, gerenciar qual está ativo, passar `TOut` do anterior como `TIn` do próximo.

**4.3 — EditMode passa a ser uma configuração de rota, não um flag espalhado.**

Em vez de `editMode?: boolean` com clamp manual, EditMode **começa o wizard no step `ai_editor` com `TIn` pré-preenchido** e os steps anteriores nem são instanciados. Nada a clampar.

### Arquivos afetados

- **Reorganizar**: [src/components/adaptation/](../../src/components/adaptation/) inteiro — mover cada Step para sua pasta.
- **Simplificar**: [src/components/adaptation/AdaptationWizard.tsx](../../src/components/adaptation/AdaptationWizard.tsx) — orquestrador mínimo.
- **Deletar**: `editMode`, `editModeMinStep`, `requestBack` com clamp. O próprio tipo do wizard reflete "linha reta de steps a partir do step inicial".

### Validação

Antes: adicionar um step X exige tocar em 5 arquivos.
Depois: criar pasta `steps/x/`, registrar no orquestrador. 2 arquivos.

---

## Fase 5 — Estratégia de testes focada em fluxos round-trip

### Problema

Os testes atuais cobrem "o botão chama a função X" mas não "o usuário completa o fluxo e os dados persistem corretamente". Daí bugs como o da canon (passou todos os unit tests, quebrou em produção).

### Plano

**5.1 — Três camadas de teste.**

| Camada | Ferramenta | Exemplo | Objetivo |
|---|---|---|---|
| **Invariantes** | Vitest + fast-check | `dsl → structured → dsl` é idempotente | Pegar bugs de conversão antes de qualquer integração |
| **Componente** | Vitest + Testing Library | "clicar salvar chama supabase.update com payload correto" | Smoke de handlers (já temos) |
| **Round-trip** | Vitest + supabase-js apontando pro local | "gerar → editar layout → salvar → reabrir → layout idêntico" | Pegar bugs de ponta-a-ponta (novo) |

**5.2 — Testes de round-trip obrigatórios pra cada feature que persiste estado.**

Template:

```ts
describe("Adaptation persistence round-trip", () => {
  it("layout da adaptada sobrevive save → reload", async () => {
    const client = createSupabaseTestClient();         // aponta pro local
    const userId = await seedTeacher(client);

    const initial = await createAdaptation(client, { teacher: userId, ... });
    const edited = mutateDirectedLayout(initial, { spacingAfter: 40 });
    await saveAdaptation(client, edited);

    const reloaded = await fetchAdaptation(client, initial.id);
    expect(reloaded.editable_activity_directed).toEqual(edited.editable_activity_directed);
    expect(reloaded.editable_activity_universal).toEqual(edited.editable_activity_universal);
  });

  it("editar apenas adaptada NÃO muda original", async () => { ... });
  it("re-editar mantém versão anterior até o novo save", async () => { ... });
});
```

Isso vale ouro: todos os bugs desta sessão (cursor jump, duplicação, state loss, canon falso positivo) teriam sido pegos aqui.

**5.3 — CI bloqueia merge se testes round-trip falharem.**

Adicionar job no GitHub Actions que sobe Supabase local, roda os testes de round-trip, e faz status check obrigatório.

### Arquivos afetados

- **Novos**: `src/test/round-trip/adaptation.test.ts`, `src/test/round-trip/helpers.ts`
- **Modificar**: [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml) — job novo com `supabase start` antes do teste.

---

## Fase 6 — Guardrails de longo prazo

Coisas pequenas que, instaladas agora, impedem o retorno dos problemas.

**6.1 — ESLint rule custom: proibir `useEffect` que chama props.**

```js
// eslint-local-rules/no-sync-effect.js
// Reprova: useEffect que, no corpo, chama prop cujo nome começa com "on" ou "set"
// ou acessa updateData/setData.
```

Força o padrão da Fase 2.

**6.2 — PR template com checklist.**

```md
- [ ] Novo state adicionado? Onde é a single source of truth?
- [ ] Nova conversão de dados? Tem teste de idempotência/round-trip?
- [ ] Novo useEffect? Ele pertence a um boundary (DOM/IO) ou sincroniza state?
- [ ] Mudança persiste em DB? Tem teste round-trip?
```

**6.3 — Documento `docs/architecture/editor-state-model.md` (a escrever depois da Fase 1).**

Um diagrama de quem-é-dono-do-quê no editor. Atualizado em cada PR que mexe no modelo.

**6.4 — Telemetria de erros em produção.**

Hoje um bug como "canon falso positivo" só apareceu quando o usuário reportou. Enviar `console.error` pra Sentry (ou equivalente) torna o sinal visível.

---

## Roadmap de execução recomendado

| # | Fase | Esforço | Impacto | Dependências |
|---|---|---|---|---|
| 1 | Fase 3 (invariantes + branded types) | 2-3 dias | Alto | Nenhuma |
| 2 | Fase 1 (`useActivityContent`) | 3-4 dias | Muito alto | Fase 3 |
| 3 | Fase 5 (round-trip tests) | 2 dias | Alto | Fase 1 |
| 4 | Fase 2 (`useVersionedLayout`) | 2-3 dias | Alto | Fase 1 |
| 5 | Fase 4 (quebrar wizard) | 4-5 dias | Médio (ROI longo prazo) | Fases 1, 2 |
| 6 | Fase 6 (guardrails) | 1 dia | Médio (preventivo) | Qualquer momento |

**Por que começar pela Fase 3?** Porque os testes de invariante são gratuitos de adicionar agora (não requerem refatorar nada), já pegam bugs em aberto, e servem de rede de segurança pra quando você for mexer nas fases de refactor pesado.

**Critério de parada pra cada fase**: testes verdes + um roteiro de QA manual validado (`docs/qa/*.md` por fase).

---

## Resumo — o que muda depois disso

Antes:
- 5 lugares com o mesmo texto, sincronizados por useEffects que correm uns contra os outros.
- Bugs de sincronização diagnosticáveis só por leitura densa do código.
- Testes unitários passam, produção quebra.
- Wizard monolítico de 500 linhas.

Depois:
- 1 fonte de verdade por conceito. Outras são derivadas.
- Efeitos restritos a boundaries. Races sumidas por construção.
- Property tests garantem invariantes; round-trip tests garantem fluxos.
- Wizard = orquestrador magro; cada step é um módulo autocontido.

Tempo médio pra investigar um bug novo vai cair de "ler 4 arquivos pra entender quem escreve em quem" pra "ler a fonte única e o reducer daquele step". É esse o ganho que justifica o investimento.

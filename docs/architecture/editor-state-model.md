# Modelo de estado do editor de atividades

Este doc descreve como o estado flui do textarea (DSL cru) até o wizard e os
renderers PDF/DOCX. Ele existe porque a camada do editor é onde nasceram os
bugs mais caros do produto (cursor pulando, questões deletadas voltando, layout
zerando entre steps). Se você vai mexer em `src/components/editor/` ou nos
steps 5–6 do wizard, leia isto antes.

## Invariantes do sistema

1. **Uma fonte de verdade por versão (universal/dirigida)**: para cada
   versão existe exatamente UMA instância de `useActivityContent`. Todo
   componente que precisa ler ou escrever o DSL daquela versão passa pelo
   mesmo hook — nada de estado paralelo em `useState` local.

2. **Canonicalização é síncrona**: `setDsl(next)` chama `toCanonicalDsl` no
   mesmo turno de render antes de persistir. O textarea nunca observa um
   estado "cru em trânsito" — se `[img:https://...]` entra, `[img:imagem-3]`
   já sai como novo `value` no mesmo commit. Isso elimina a classe de bug
   onde o cursor pula porque a textarea re-renderiza com texto encurtado um
   tick depois.

3. **Histórico vive com o conteúdo**: undo/redo são do hook. O `ActivityEditor`
   recebe `onUndo`/`onRedo`/`canUndo`/`canRedo` e é só consumidor — não
   mantém ring buffer próprio. Isso impede inconsistência entre "o textarea
   voltou" e "o registry de imagens voltou".

4. **Efeitos não propagam estado para cima**: a regra lint
   `local/no-sync-effect` reprova chamar `updateData` ou props `onXxx` dentro
   de `useEffect`. Propagação acontece nos handlers que geraram a mudança
   (onChange do textarea, onClick dos botões). Efeitos ficam para I/O
   (fetch, timers, subscrições) — nunca para sincronizar props pai.

5. **"Expanded DSL" cruza a fronteira do editor**: o wizard e os renderers
   consomem `content.dslExpanded` (com URLs brutas), não `content.dsl` (com
   placeholders `[img:imagem-N]`). Placeholders só existem dentro do
   textarea, para ergonomia de edição.

## Contrato do `useActivityContent`

```ts
const content = useActivityContent({
  initialDsl,        // seed inicial (cru ou canônico — é normalizado uma vez)
  initialRegistry,   // { nome: url } vindo do wizard
  onChange,          // chamado APÓS setDsl/undo/redo/reset (nunca no mount)
});

// Leitura:
content.dsl          // canônico, para o textarea
content.dslExpanded  // com URLs brutas, para parser/renderer
content.registry     // { nome: url }
content.canUndo      // boolean
content.canRedo      // boolean

// Escrita:
content.setDsl(v)    // fonte única de mudanças do textarea
content.undo()
content.redo()
content.reset(state) // regenerate/edit-mode: troca completa
```

Pontos sutis:

- `onChange` NÃO dispara no mount. Se o wizard precisa persistir o DSL seed
  inicial, o seed já deve estar em `initialDsl` (caller responsibility).
- `reset()` dispara `onChange` (regenerar IA reseta; wizard recebe o novo DSL).
- Chamar `setDsl` com o mesmo valor canônico resultante é no-op (não empurra
  para o histórico).

## Como o wizard conecta as peças

```
WizardData {
  aiEditorUniversalDsl?: string;  ←─┐ drafts do editor por versão;
  aiEditorDirectedDsl?: string;   ←─┤ sobrevivem à navegação entre steps.
  manualEditorDsl?: string;       ←─┤
  editorImageRegistry?: ImageRegistry; ─┤ compartilhado pelos dois hooks
                                         │ (last-write-wins é aceitável —
                                         │ edge case só ocorre com mesmo
                                         │ nome curto + URLs diferentes).
  editableActivity?: EditableActivity;  ─┤ layout PDF (step 6), mantido pelo
  editableActivityDirected?: EditableActivity; ─┤ useVersionedLayout.
  pdfLayout?: PdfLayoutConfig;    ─┘
}
```

Step 5 (StepAIEditor / StepEditor):
- Monta `useActivityContent` com `data.aiEditorUniversalDsl ?? fallback`.
- `onChange` dispara `updateData({ aiEditorUniversalDsl: dsl })`.
- Ao regenerar, o effect-watcher observa mudança em `data.result`, chama
  `hook.reset(novoDsl)`, e o próprio reset dispara `onChange` que
  atualiza o wizard.

Step 6 (StepPdfPreview):
- Consome `data.editableActivity` + `data.editableActivityDirected` via
  `useVersionedLayout`.
- Novos textos do editor só invalidam o layout se o DSL realmente mudou
  (ver `buildAIEditorAdvancePatch`/`buildManualEditorAdvancePatch` em
  `adaptationWizardHelpers.ts`).

## Antipatterns reprovados

| Padrão | Por quê |
|---|---|
| `useEffect(() => updateData({...}), [x])` | Sync loop; eslint bloqueia. |
| `useState` paralelo ao DSL do hook em um step | Dois textos desincronizam. |
| Pós-processar `dsl` fora de `setDsl` (ex. em `onChange` do textarea) | Render lê valor stale; cursor pula. |
| Passar `dsl` (canônico) para renderer PDF | URLs viram placeholders sem contexto. |
| Chamar `setDsl(value)` em `onChange` + também propagar `onDslChange(value)` direto | O hook já encaminha via `onChange` config; caller duplica eventos. |

## Orquestração dos steps (Fase 4)

Cada step vive em `src/components/adaptation/steps/<slug>/` e exporta um
`StepModule` (ver `steps/types.ts`):

```ts
export const aiEditorStep: StepModule = {
  key: "ai_editor",
  label: "Editor",
  description: "Editar atividade adaptada",
  Component: (ctx) => <StepAIEditor {...mapped(ctx)} />,
};
```

O orquestrador (`AdaptationWizard`) nunca referencia um step específico: ele lê
`STEP_REGISTRY[currentStepKey].Component` e renderiza. Adicionar um novo step =
criar a pasta + registrar em `steps/index.ts` + posicionar em `wizardSteps.ts`.
Remover = apagar a pasta e tirar a linha do registry. EditMode não é flag — é
configuração de rota: `initialStepKey="ai_editor"` + `lockedBeforeStep="ai_editor"`.

## Telemetria (Fase 6.4)

Erros de fluxo crítico (export PDF, save/reload) passam por
`@/lib/telemetry#captureException`, não por `console.error` direto. Hoje o
módulo é um wrapper no-op até `VITE_SENTRY_DSN` estar provisionado; quando
estiver, a troca é em um arquivo só (`src/lib/telemetry.ts`). Callers novos:
prefira `captureException(error, { where: "..." })` sobre `console.error`.

## Para onde o modelo pode evoluir

- Step 6 ainda propaga layout para o wizard via `onUniversalChange` dentro de
  `useEffect` — classificado como legado na regra lint. Migração natural: o
  `useVersionedLayout` expor o `onChange` do mesmo jeito que
  `useActivityContent` faz.
- Edge-case do registry compartilhado entre universal e dirigida pode ser
  resolvido namespando nomes por versão (`imagem-u-1`, `imagem-d-1`) se
  algum dia gerar colisão real. Por ora: teórico.
- Persistência em disco (round-trip save→reload) vive em
  `src/test/round-trip/` e exercita o modelo inteiro — se um invariante
  quebra, esse teste é o canário.

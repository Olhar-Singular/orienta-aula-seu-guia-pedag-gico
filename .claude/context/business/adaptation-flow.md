# Fluxo de Adaptação

## Wizard — 7 Steps

O wizard tem dois modos de operação. A escolha entre IA e Manual ocorre **após** a seleção do aluno e barreiras:

```
[1] Tipo → [2] Conteúdo → [3] Barreiras → [4] Modo → [5] Editor → [6] Layout PDF → [7] Exportar
```

- **[5] Editor**: `StepAIEditor` no modo IA (gera e edita DSL universal/dirigida), `StepEditor` no modo manual.
- **[6] Layout PDF**: `StepPdfPreview` com editor visual dual-column (universal vs dirigida), coloração inline por palavra e formatação bold/italic.

## Fluxos

- **Fluxo IA**:     `type → content → barriers → choice → AI editor → pdf layout → export`
- **Fluxo Manual**: `type → content → barriers → choice → manual editor → pdf layout → export`

O step `choice` existe em **ambas** as sequências no mesmo índice, permitindo trocar de modo sem perder o step index. Barreiras selecionadas são ignoradas no modo manual (decisão de produto).

## Estado preservado entre steps

Ver `src/lib/adaptationWizardHelpers.ts`. `WizardData` mantém:

- Drafts do editor: `aiEditorUniversalDsl`, `aiEditorDirectedDsl`, `manualEditorDsl`, `editorImageRegistry`
- Layout editado: `editableActivity`, `editableActivityDirected`, `pdfLayout`, `pdfHistoryUniversal`, `pdfHistoryDirected`

Layout só é invalidado quando o texto do editor realmente muda. Voltar do editor com resultado já gerado dispara diálogo "Descartar resultado?". Reset de geração centralizado em `resetGeneratedState()`.

## Rótulos das versões

A IA produz `version_universal` + `version_directed`, exibidos como **"Versão Original"** e **"Versão Adaptada"** em toda a UI e exports (PDF/DOCX). Os nomes `_universal`/`_directed` permanecem só no shape interno por compatibilidade de schema.

## Tipos Estruturados

```typescript
StructuredActivity { sections: ActivitySection[] }
  └── ActivitySection { questions: StructuredQuestion[] }
       └── StructuredQuestion {
             type: QuestionType,
             statement,
             alternatives?,        // multiple_choice
             check_items?,         // multiple_answer ([x]/[ ])
             tf_items?,            // true_false (V/F/em branco)
             match_pairs?,         // matching (a -- b)
             order_items?,         // ordering ([1], [2], ...)
             table_rows?,          // table (linhas de células)
             blank_placeholder?,   // fill_blank
             scaffolding?,         // passos de apoio DUA
             content?              // ContentBlock[] (formato novo, suporta richContent bold/italic)
           }

QuestionType =
  | 'multiple_choice'
  | 'multiple_answer'   // checkboxes
  | 'open_ended'
  | 'fill_blank'
  | 'true_false'
  | 'matching'
  | 'ordering'
  | 'table'
```

Resultado da IA é `AdaptationResult` com `version_universal` + `version_directed`, ambos `StructuredActivity` ou string legada (markdown DSL).

## Rich content (bold/italic)

`InlineRun = { text: string; color?: string; bold?: boolean; italic?: boolean }`. Convertido a partir de markdown inline (`**bold**`, `*italic*`) por `src/lib/parseMarkdownInline.ts`. Invariante: concatenação de `richContent[].text` deve ser igual a `ContentBlock.content` (plain text mirror).

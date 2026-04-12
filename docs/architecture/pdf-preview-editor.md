# PDF Preview Editor - Especificacao Tecnica

## Visao Geral

Editor visual de layout de PDF que permite ao professor ajustar o documento final antes de exportar. O professor nao edita o texto em si (isso acontece no step anterior), mas controla: posicionamento e tamanho de imagens, estilizacao visual do texto, quebras de pagina, espacamento, cabecalho e ordem das questoes.

### Posicao no Fluxo do Wizard

```
[1] Tipo → [2] Conteudo → [3] Barreiras → [4] Editor IA → [5] Preview PDF → [6] Exportar
                                                            ^^^^^^^^^^^^^^^^
                                                            NOVA TELA
```

Step 5 entra entre o editor (ai_editor/editor) e o export. O wizard passa de 5 para 6 steps no modo IA e de 5 para 6 no modo manual.

Constante `STEP_SEQUENCES` em `AdaptationWizard.tsx`:
```
ai:     ["type", "content", "barriers", "choice", "ai_editor", "pdf_preview", "export"]
manual: ["type", "content", "barriers", "choice", "editor", "pdf_preview", "export"]
```

---

## Modelo de Dados

### Mudanca Central: `statement: string` -> `ContentBlock[]`

Hoje cada questao tem `statement: string` e imagens separadas num map `QuestionImageMap = Record<string, string[]>`. O novo modelo coloca imagens inline no conteudo, na posicao exata onde o professor quer.

#### Tipos Novos (em `src/types/adaptation.ts`)

```typescript
// Fontes embutidas no @react-pdf/renderer (sem Font.register)
type PdfFontFamily = "Helvetica" | "Courier" | "Times-Roman";

type TextStyle = {
  fontSize?: number;              // pontos, default 11
  fontFamily?: PdfFontFamily;
  bold?: boolean;                 // default false
  italic?: boolean;               // default false
  textAlign?: "left" | "center" | "right" | "justify";
  lineHeight?: number;            // multiplicador, default 1.5
};

type ContentBlock =
  | { id: string; type: "text"; content: string; style?: TextStyle }
  | { id: string; type: "image"; src: string; width: number; alignment: "left" | "center" | "right"; caption?: string }
  | { id: string; type: "page_break" };
```

#### Extensao de `StructuredQuestion`

```typescript
interface StructuredQuestion {
  number: number;
  type: QuestionType;

  // ANTES: statement era string e images era string[]
  // DEPOIS: content eh uma lista ordenada de blocos
  content: ContentBlock[];

  // Campos que permanecem iguais
  statementFormat?: 'text' | 'html';
  instruction?: string;
  alternatives?: Alternative[];
  blank_placeholder?: string;
  scaffolding?: string[];

  // DEPRECATED - substituidos por content
  statement?: string;     // mantido temporariamente para retrocompatibilidade
  images?: string[];      // mantido temporariamente para retrocompatibilidade

  // Novos campos de layout
  spacingAfter?: number;        // pontos extra apos a questao (default 20)
  answerLines?: number;         // linhas pontilhadas para resposta (0 = nenhuma)
  showSeparator?: boolean;      // linha horizontal antes da questao
  alternativeIndent?: number;   // pontos de recuo das alternativas (default 12)
}
```

#### Tipo `ActivityHeader`

```typescript
type ActivityHeader = {
  schoolName: string;
  subject: string;
  teacherName: string;
  className: string;
  date: string;
  showStudentLine: boolean;
  logoSrc?: string;             // data URL ou URL do storage
  logoWidth?: number;           // pontos, default 60
};
```

#### Tipo `StylePreset`

```typescript
type StylePreset = {
  id: string;
  name: string;
  description: string;
  textStyle: Required<TextStyle>;
  questionSpacing: number;
  alternativeIndent: number;
};
```

Presets embutidos:
- **Prova Formal**: Times-Roman 12pt, justificado, espacamento 1.5x
- **Atividade Leve**: Helvetica 11pt, alinhado a esquerda, espacamento 1.5x
- **Alto Contraste**: Helvetica 14pt, negrito, espacamento 2x (DUA)

#### Tipo `PdfLayoutConfig`

Agrupa tudo que o Preview Editor controla, separado do conteudo da adaptacao:

```typescript
type PdfLayoutConfig = {
  header: ActivityHeader;
  globalShowSeparators: boolean;
  questionLayouts: Record<string, {    // chave = questionId
    spacingAfter?: number;
    answerLines?: number;
    showSeparator?: boolean;
    alternativeIndent?: number;
    alternativeOrder?: number[];       // indices reordenados
  }>;
  contentOverrides: Record<string, ContentBlock[]>;  // chave = questionId
  presetId?: string;                   // ultimo preset aplicado
};
```

Esse tipo fica no `WizardData` e eh passado pro step de export.

---

## Migracao do Pipeline Existente

### De / Para

| Antes | Depois |
|-------|--------|
| `StructuredQuestion.statement: string` | `StructuredQuestion.content: ContentBlock[]` |
| `StructuredQuestion.images: string[]` | Imagens inline em `content` como blocos `type: "image"` |
| `QuestionImageMap` separado | Eliminado (imagens vivem dentro de `content`) |
| `questionImagesUniversal` / `questionImagesDirected` | Eliminado |
| `AdaptationPDF.renderSectionWithImages()` | Render direto de `ContentBlock[]` |

### Funcao de Migracao

Para atividades existentes (legado), converter automaticamente:

```typescript
function migrateToContentBlocks(question: StructuredQuestion, images?: string[]): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // Statement vira bloco de texto
  if (question.statement) {
    blocks.push({
      id: generateId(),
      type: "text",
      content: question.statement,
    });
  }

  // Imagens vao para o final (posicao historica)
  if (images && images.length > 0) {
    for (const src of images) {
      blocks.push({
        id: generateId(),
        type: "image",
        src,
        width: images.length === 1 ? 0.7 : 0.4,
        alignment: "center",
      });
    }
  }

  return blocks;
}
```

Essa funcao roda no momento em que o usuario entra no step "pdf_preview". A IA continua retornando `statement: string` e `images: string[]` — a conversao para `ContentBlock[]` acontece na fronteira entre o editor e o preview.

### Arquivos Impactados na Migracao

| Arquivo | Mudanca |
|---------|---------|
| `src/types/adaptation.ts` | Adicionar `ContentBlock`, `TextStyle`, `PdfFontFamily`, `ActivityHeader`, `StylePreset` |
| `src/lib/activityParser.ts` | Preservar posicao inline de `[img:...]` ao parsear DSL |
| `src/lib/activityDslConverter.ts` | Suportar `ContentBlock[]` no `structuredToMarkdownDsl()` e `markdownDslToStructured()` |
| `src/components/adaptation/AdaptationWizard.tsx` | Adicionar step "pdf_preview", criar `PdfLayoutConfig` no `WizardData` |
| `src/components/adaptation/StepExport.tsx` | Receber `PdfLayoutConfig` e passar para o PDF renderer |
| `src/lib/pdf/templates/AdaptationPDF.tsx` | Refatorar para renderizar `ContentBlock[]` em vez de string + image map |
| `src/lib/pdf/components/PDFImage.tsx` | Aceitar `width` e `alignment` dinamicos |
| `src/lib/exportPdf.ts` | Aceitar `PdfLayoutConfig` em vez de `ExportData` |
| `src/components/editor/imageManagerUtils.ts` | Gerar `ContentBlock` de imagem em vez de DSL text |
| `src/components/adaptation/StepAIEditor.tsx` | Converter resultado da IA para `ContentBlock[]` antes de passar ao preview |

---

## Componentes

### 1. `StepPdfPreview` (pagina principal)

**Arquivo**: `src/components/adaptation/StepPdfPreview.tsx`

**Responsabilidades**:
- Recebe `WizardData` com o resultado da adaptacao
- Converte `StructuredActivity` para `ContentBlock[]` (via funcao de migracao)
- Gerencia state do layout via `useHistory` (undo/redo)
- Coordena re-render do PDF blob via debounce
- Renderiza split layout: editor a esquerda, preview a direita

**Props**:
```typescript
type Props = {
  data: WizardData;
  onNext: () => void;
  onBack: () => void;
  onLayoutChange: (config: PdfLayoutConfig) => void;
};
```

**State interno**:
- `activity: MockActivity` — modelo editavel (via `useHistory`)
- `blob: Blob | null` — PDF gerado
- `zoom: number` — nivel de zoom do preview
- `selectedQuestionId: string | null` — questao selecionada para sync

### 2. `StructuralEditor`

**Arquivo**: `src/components/adaptation/pdf-preview/StructuralEditor.tsx`

**Responsabilidades**:
- Arvore do documento com drag-and-drop
- Controles de estilo por bloco de texto (fonte, tamanho, negrito, italico, alinhamento, line-height)
- Controles de tamanho/alinhamento por imagem
- Reordenacao de questoes, blocos e alternativas
- Controles de layout por questao (espacamento, linhas de resposta, separador, recuo)
- Editor de cabecalho (campos, logo, linha do aluno)
- Toggle global de separadores

**Dependencias**: `@dnd-kit/core`

### 3. `PdfCanvasPreview`

**Arquivo**: `src/components/adaptation/pdf-preview/PdfCanvasPreview.tsx`

**Responsabilidades**:
- Recebe `Blob` e renderiza cada pagina como canvas via `pdfjs-dist`
- Suporta zoom (50% a 200%) com `devicePixelRatio` para nitidez
- Indicador "Atualizando..." durante re-render

**Dependencias**: `pdfjs-dist` (ja instalado no projeto)

### 4. `AdaptationPDF` (refatorado)

**Arquivo**: `src/lib/pdf/templates/AdaptationPDF.tsx`

**Mudancas**:
- Aceitar `ContentBlock[]` por questao em vez de string + image map
- Renderizar cabecalho editavel (`ActivityHeader`) com logo, campos e linha do aluno
- Respeitar `spacingAfter`, `answerLines`, `showSeparator`, `alternativeIndent` por questao
- Aplicar `TextStyle` por bloco (fonte, tamanho, bold/italic, alinhamento, line-height)
- Resolver variantes de fonte: `Helvetica-Bold`, `Times-BoldItalic`, `Courier-Oblique`, etc.
- Renderizar linhas pontilhadas de resposta
- Renderizar separadores horizontais

### 5. `useHistory` hook

**Arquivo**: `src/hooks/useHistory.ts`

**Interface**:
```typescript
function useHistory<T>(initial: T): {
  current: T;
  set: (next: T) => void;
  undo: () => void;
  redo: () => void;
  reset: (value: T) => void;
  canUndo: boolean;
  canRedo: boolean;
}
```

- Stack de ate 50 estados
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y / Ctrl+Shift+Z (redo)
- Ignora inputs focados (nao captura undo de campos de texto)

---

## Detalhes do PDF Renderer

### Resolucao de Fontes

`@react-pdf/renderer` usa variantes de nome para bold/italic. A funcao `resolveFontFamily()` mapeia:

| Base | Normal | Bold | Italic | Bold+Italic |
|------|--------|------|--------|-------------|
| Helvetica | Helvetica | Helvetica-Bold | Helvetica-Oblique | Helvetica-BoldOblique |
| Courier | Courier | Courier-Bold | Courier-Oblique | Courier-BoldOblique |
| Times-Roman | Times-Roman | Times-Bold | Times-Italic | Times-BoldItalic |

### Renderizacao de ContentBlock

```
ContentBlock { type: "text" }       → <Text style={textStyleToPdf(block.style)}>{block.content}</Text>
ContentBlock { type: "image" }      → <View style={alignment}><Image src={block.src} style={{width: W * block.width}} /></View>
ContentBlock { type: "page_break" } → <View break />
```

### Cabecalho

```
┌────────────────────────────────────────────────────┐
│ [LOGO]  Escola Municipal Paulo Freire              │
│         Lingua Portuguesa - 5o ano                 │
│         Professor(a): Ana Silva | Turma: 5A | Data │
│                                                    │
│         Nome do aluno(a): _____________________    │
├────────────────────────────────────────────────────┤
│ Questao 1                                          │
│ ...                                                │
```

### Linhas de Resposta

Linhas pontilhadas para questoes dissertativas. Cada linha tem 20pt de altura com `borderBottom` de 0.5pt cinza. Renderizadas apos as alternativas (se houver) ou apos o conteudo.

### Separadores

Linha horizontal (`borderTop: 0.5pt solid #9ca3af`) antes da questao. Pode ser habilitada globalmente (todas as questoes) ou individualmente.

---

## Interacoes do Usuario

### Toolbar Superior

| Elemento | Acao |
|----------|------|
| Undo / Redo | Botoes + Ctrl+Z / Ctrl+Y |
| Zoom - / % / + / Fit | Controle de zoom do preview (50% a 200%) |
| Estilos | Menu dropdown com presets + templates salvos + "Salvar como template" |
| Resetar | Volta ao estado original |
| Voltar | Retorna ao step anterior (editor) |
| Exportar | Avanca para o step de export com layout definido |

### Editor Estrutural (painel esquerdo)

| Interacao | Comportamento |
|-----------|--------------|
| Arrastar questao (handle) | Reordena questoes inteiras. Renumera automaticamente. |
| Arrastar bloco de texto (handle) | Move entre posicoes dentro da mesma questao ou entre questoes. |
| Arrastar imagem (handle) | Move entre posicoes dentro da mesma questao ou entre questoes. |
| Clicar bloco de texto | Expande painel de estilo (fonte, tamanho, B, I, alinhamento, line-height) |
| Controles de imagem | Tamanho (- % +), alinhamento (esq/centro/dir), remover |
| Setas em alternativas | Move alternativa para cima/baixo dentro da questao |
| + entre blocos | Insere quebra de pagina |
| Layout da questao (expandir) | Espacamento, linhas de resposta, separador, recuo de alternativas |
| Cabecalho (expandir) | Campos editaveis, upload de logo, toggle nome do aluno |
| Separadores globais (checkbox) | Ativa separador horizontal entre todas as questoes |

### Preview (painel direito)

| Interacao | Comportamento |
|-----------|--------------|
| Scroll | Navega pelas paginas do PDF |
| Indicador "Atualizando..." | Aparece no canto durante re-render (200ms debounce) |
| Clicar questao no editor | Destaca a questao no editor (borda azul) |

---

## Persistencia

### Templates de Estilo

Salvos no `localStorage` com chave `pdf-editor-templates`. Formato:

```json
[
  {
    "id": "custom-1712...",
    "name": "Meu estilo",
    "description": "Template salvo pelo professor",
    "textStyle": { "fontSize": 12, "fontFamily": "Times-Roman", ... },
    "questionSpacing": 24,
    "alternativeIndent": 16
  }
]
```

Persistem entre sessoes do browser. Nao sao salvos no banco (decisao de simplificacao; pode evoluir para Supabase futuramente).

### Layout da Atividade

O `PdfLayoutConfig` eh passado para o step de export via `WizardData.pdfLayout`. Nao eh persistido no banco de forma separada — o layout eh aplicado no momento do export e o PDF final reflete as escolhas do professor.

Se o professor salvar a adaptacao no historico (`adaptations_history`), o layout pode ser salvo como JSON no campo `metadata` da tabela, permitindo re-editar o layout no futuro.

---

## Dependencias

| Pacote | Versao | Uso | Status |
|--------|--------|-----|--------|
| `@react-pdf/renderer` | ^4.0.0 | Gerar PDF blob | Ja instalado |
| `pdfjs-dist` | 4.4.168 | Renderizar PDF como canvas | Ja instalado |
| `@dnd-kit/core` | ^6.x | Drag-and-drop de blocos e questoes | Ja instalado (prototipo) |
| `@dnd-kit/sortable` | ^8.x | Sortable lists | Ja instalado (prototipo) |
| `@dnd-kit/utilities` | ^3.x | CSS transform utilities | Ja instalado (prototipo) |

Nenhuma dependencia nova necessaria.

---

## Restricoes e Limitacoes

1. **SVG nao suportado no `<Image>` do @react-pdf/renderer** — imagens devem ser PNG ou JPEG. SVGs precisam ser convertidos para PNG via canvas antes de entrar no pipeline.

2. **Fontes limitadas** — apenas Helvetica, Courier e Times-Roman (embutidas). Fontes customizadas requerem `Font.register()` com URL de arquivo .ttf/.otf e aumentam o bundle.

3. **Quebras de pagina automaticas** — o @react-pdf/renderer decide onde quebrar quando o conteudo nao cabe. O editor permite forcar quebras (`<View break />`), mas remover uma quebra automatica "ruim" requer usar `wrap={false}` no bloco, o que pode causar overflow.

4. **Performance de re-render** — gerar o blob PDF e renderizar via pdfjs-dist leva ~200-500ms para documentos pequenos (5 questoes). Debounce de 200ms suaviza a experiencia. Para documentos maiores, considerar aumentar o debounce ou adicionar geracao lazy (so re-gerar a pagina visivel).

5. **Tamanho de imagens** — manter limite de 8 imagens e 8000 chars de texto conforme ja existe no sistema.

---

## Plano de Implementacao

### Fase 1 — Tipos e Migracao

1. Adicionar tipos novos em `src/types/adaptation.ts` (`ContentBlock`, `TextStyle`, `PdfFontFamily`, `ActivityHeader`, `StylePreset`, `PdfLayoutConfig`)
2. Criar funcao `migrateToContentBlocks()` em `src/lib/contentBlockMigration.ts`
3. Criar type guard `hasContentBlocks()` para detectar formato novo vs legado
4. Testes unitarios para a migracao

### Fase 2 — Hook useHistory

1. Mover `useHistory` do prototipo para `src/hooks/useHistory.ts`
2. Testes unitarios para undo/redo/reset

### Fase 3 — Refatorar PDF Renderer

1. Refatorar `AdaptationPDF.tsx` para aceitar `ContentBlock[]` em vez de string + image map
2. Refatorar `PDFImage.tsx` para aceitar `width` e `alignment` dinamicos
3. Adicionar render de `ActivityHeader` (logo, campos, linha do aluno)
4. Adicionar render de `answerLines`, `separators`, `alternativeIndent`
5. Adicionar `resolveFontFamily()` e `textStyleToPdf()`
6. Manter retrocompatibilidade: se receber `statement: string`, converter on-the-fly

### Fase 4 — Componentes do Editor

1. Criar `src/components/adaptation/pdf-preview/PdfCanvasPreview.tsx`
2. Criar `src/components/adaptation/pdf-preview/StructuralEditor.tsx`
3. Criar `src/components/adaptation/StepPdfPreview.tsx` (pagina principal do step)

### Fase 5 — Integracao com Wizard

1. Adicionar step "pdf_preview" em `STEP_SEQUENCES`
2. Adicionar `STEP_META` para o novo step
3. Adicionar `pdfLayout: PdfLayoutConfig` ao `WizardData`
4. Converter `StructuredActivity` para modelo editavel ao entrar no step
5. Passar `PdfLayoutConfig` para `StepExport`
6. Atualizar `StepExport` para usar layout do preview

### Fase 6 — Parser/DSL (se necessario)

1. Atualizar `activityParser.ts` para preservar posicao inline de `[img:...]`
2. Atualizar `activityDslConverter.ts` para converter `ContentBlock[]`
3. Atualizar `imageManagerUtils.ts` para gerar `ContentBlock` de imagem

### Fase 7 — Presets e Templates

1. Definir presets embutidos
2. Implementar menu de presets na toolbar
3. Implementar salvar/carregar templates no localStorage
4. Funcao `applyPreset()` que modifica todos os blocos de texto

### Fase 8 — Limpeza

1. Remover campos deprecated (`statement`, `images` separados) apos migracao completa
2. Remover `questionImagesUniversal` / `questionImagesDirected` do pipeline de export
3. Remover `renderSectionWithImages()` do `AdaptationPDF.tsx`
4. Deletar arquivos do prototipo (`src/pages/prototype/`, `src/pages/PrototypePdfEditor.tsx`)
5. Remover rota `/prototype/pdf-editor` do `App.tsx`

---

## Referencia: Prototipo

Os seguintes arquivos de prototipo servem como referencia de implementacao e podem ser consultados para decisoes de UI, logica de drag-and-drop, e rendering do PDF:

| Arquivo | O que referenciar |
|---------|-------------------|
| `src/pages/prototype/mockActivity.ts` | Tipos (`ContentBlock`, `TextStyle`, `ActivityHeader`, `StylePreset`, presets) |
| `src/pages/prototype/StructuralEditor.tsx` | Drag-and-drop, controles de estilo, header editor, layout controls |
| `src/pages/prototype/PrototypePdfDocument.tsx` | `resolveFontFamily()`, `textStyleToPdf()`, render de header/answer lines/separators |
| `src/pages/prototype/PdfCanvasPreview.tsx` | Render via pdfjs-dist com zoom e devicePixelRatio |
| `src/pages/prototype/useHistory.ts` | Hook de undo/redo com keyboard shortcuts |
| `src/pages/PrototypePdfEditor.tsx` | Composicao da pagina, debounce, presets menu, save template |

Estes arquivos serao deletados na Fase 8 apos a implementacao completa.

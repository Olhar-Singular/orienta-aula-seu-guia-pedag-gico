# Enriquecer extração e edição de questões com IA

**Data:** 2026-05-14
**Tela:** `/dashboard/banco-questoes` (review pós-extração) e modal de edição.
**Origem:** Pedido do usuário para (1) extrair todos os tipos de questão do `StepAIEditor`, (2) editar alternativas direto na lista de revisão, (3) deletar questão da lista, (4) corrigir bug do checkbox em questões duplicadas.

---

## 1. Objetivo

Trazer paridade entre a extração de questões via IA e o editor de atividades adaptadas (`StepAIEditor`). Hoje a extração só cobre múltipla escolha e dissertativa, e a edição inline permite apenas trocar o gabarito (não o texto das alternativas). O alvo é suportar os 8 tipos do `StructuredQuestion` em [src/types/adaptation.ts:89-97](../../../src/types/adaptation.ts#L89-L97), com edição completa e fluxo de descarte.

## 2. Escopo

### Inclui
- Suporte aos 8 tipos: `multiple_choice`, `multiple_answer`, `open_ended`, `fill_blank`, `true_false`, `matching`, `ordering`, `table`.
- Edição inline rica das alternativas (texto editável, adicionar, remover; reordenação só nos tipos onde a ordem é semântica — matching/ordering — em Phase 3).
- Botão de descarte de questão na lista de revisão (antes de salvar no banco).
- Bug fix: checkbox de questão duplicada precisar de 2 cliques.
- Remoção de `src/components/QuestionExtractModal.tsx` (código morto).
- Integração com Adaptation Wizard: questões importadas do banco viajam com tipo até `adapt-activity`.

### Não inclui
- Backfill de linhas legadas pra novo formato (`type`/`payload` ficam `NULL` e o renderer faz fallback).
- Redesign visual amplo da página `QuestionBank` — só os blocos da review e do `QuestionForm`.
- Mudança no fluxo de "Forçar inclusão" de duplicada.
- Suporte a tipos compostos no PDF/DOCX export (já tratado via DSL no `StepAIEditor`).

## 3. Diagnóstico do bug do checkbox

**Sintoma:** Em questão marcada como duplicada, o checkbox de seleção precisa ser clicado 2 vezes para mudar de estado.

**Causa raiz:** Em [src/pages/QuestionBank.tsx:717](../../../src/pages/QuestionBank.tsx#L717):

```tsx
<Checkbox
  checked={q.selected || q.saved}
  ...
/>
```

O tipo é `selected: boolean` (required) e `saved?: boolean` (optional). Quando uma questão duplicada acabou de ser extraída, `selected=false` e `saved` é `undefined`. A expressão `false || undefined` retorna `undefined` (e não `false`).

O `@radix-ui/react-checkbox` (`CheckboxPrimitive.Root`) trata `checked={undefined}` como modo **uncontrolled** — passa a gerenciar estado interno. No primeiro clique do usuário, `onCheckedChange` dispara, `selected` vira `true`, e a expressão muda para `true || undefined = true`. Radix detecta a transição uncontrolled → controlled mid-lifecycle e o estado interno desincroniza com a prop. O segundo clique alinha tudo.

**Fix:** `checked={!!(q.selected || q.saved)}` (coerção pra boolean garante modo controlled em qualquer situação).

## 4. Modelo de dados

### Schema atual (`question_bank`)
- `text: string` — enunciado
- `options: jsonb | null` — array de strings (alternativas pra múltipla escolha)
- `correct_answer: integer | null` — índice 0-based da resposta certa
- `resolution: string | null`, `image_url`, `subject`, `topic`, `difficulty`, `source`, `source_file_name`, `is_public`, `school_id`, `created_by`

### Mudanças propostas
Adicionar duas colunas, sem backfill:

```sql
ALTER TABLE question_bank ADD COLUMN type text NULL;
ALTER TABLE question_bank ADD COLUMN payload jsonb NULL;
CREATE INDEX question_bank_type_idx ON question_bank(type) WHERE type IS NOT NULL;
```

- `type` ∈ {`multiple_choice`, `multiple_answer`, `open_ended`, `fill_blank`, `true_false`, `matching`, `ordering`, `table`} ou `NULL` (legado).
- `payload` guarda a estrutura específica do tipo (apenas para os tipos novos — `multiple_choice` e `open_ended` continuam usando `options` + `correct_answer` direto, sem duplicação).

**Justificativa pra não migrar dados antigos:** evita migration pesada em produção, mantém retrocompat, e o fallback no client (`inferLegacyType()`) é trivial.

### Discriminated union (TypeScript)

Novo arquivo `src/lib/questionType.ts`:

```ts
import type {
  Alternative, CheckItem, TrueFalseItem, MatchPair, OrderItem,
} from "@/types/adaptation";

export type QuestionType =
  | "multiple_choice" | "multiple_answer" | "open_ended"
  | "fill_blank" | "true_false" | "matching" | "ordering" | "table";

export type QuestionPayload =
  | { type: "multiple_choice"; /* usa options + correct_answer */ }
  | { type: "multiple_answer"; check_items: CheckItem[] }
  | { type: "open_ended" }
  | { type: "fill_blank"; blank_placeholder: string; expected_answer?: string }
  | { type: "true_false"; tf_items: TrueFalseItem[] }
  | { type: "matching"; match_pairs: MatchPair[] }
  | { type: "ordering"; order_items: OrderItem[] }
  | { type: "table"; table_rows: string[][] };

export function inferLegacyType(row: { type: string | null; options: unknown }): QuestionType {
  if (row.type) return row.type as QuestionType;
  return Array.isArray(row.options) && row.options.length > 0 ? "multiple_choice" : "open_ended";
}
```

## 5. Phases

### Phase 1 — Quick wins (sem migration)

**Escopo:** bug fix + delete + edição rica de alternativas pra múltipla escolha + limpeza de código morto.

**Mudanças:**

1. **Bug do checkbox** ([QuestionBank.tsx:717](../../../src/pages/QuestionBank.tsx#L717)): `checked={!!(q.selected || q.saved)}`.

2. **Botão deletar questão extraída**: adicionar `<Button variant="ghost" size="sm" onClick={() => handleDiscardExtracted(i)}>` com ícone `Trash2` ao lado dos botões "Editar"/"Salvar" no card. `handleDiscardExtracted` pede confirmação via `AlertDialog` shadcn e remove o item de `extractedQuestions` (filter por index).

3. **Edição rica das alternativas** ([QuestionBank.tsx:872-900](../../../src/pages/QuestionBank.tsx#L872-L900)): quando `q.editing && q.options`, cada linha vira:
   - Toggle de gabarito (botão com letra A/B/C/D, já existe).
   - `<Input>` com o texto da alternativa (chama `updateExtracted(i, "options", newArray)`).
   - Botão `X` para remover (re-mapeia `correct_answer` se a removida era a correta → vira `null`/`-1`).
   - Botão "+ Adicionar alternativa" abaixo da lista (limite: 6).

4. **Remover** `src/components/QuestionExtractModal.tsx` (zero referências, confirmado via `grep -rn "QuestionExtractModal" src/`).

**Testes novos (TDD):**
- `src/test/question-bank-checkbox-duplicate.test.tsx` — clica uma vez, espera estado final correto.
- `src/test/question-bank-alternative-edit.test.tsx` — adiciona, edita, remove alternativa; verifica re-map de `correct_answer`.
- `src/test/question-bank-discard-extracted.test.tsx` — descarte com confirmação.

**Critério de aceite Phase 1:**
- Checkbox responde a 1 clique em qualquer estado.
- Edição de texto de alternativa persiste no array `options` ao salvar (sem mudança de schema nessa phase).
- Descarte remove o item da lista sem afetar outras questões.
- Build, lint, test passam.
- `make typecheck` passa.

---

### Phase 2 — Schema novo + V/F + Lacunas

**Escopo:** migration + 2 tipos novos na extração e edição.

**Mudanças:**

1. **Migration** `supabase/migrations/<ts>_question_bank_typed_payload.sql` (DDL acima).
   - Aplicar local com `supabase migration up --local` (não usar `make sb-reset`).
   - Push em staging com confirmação do usuário (`make db-push` após `supabase link --project-ref xnmxdnhvcrpckpbqblzx`).

2. **Helpers** em `src/lib/questionType.ts` (interface acima) + `parseQuestionRow`, `serializeQuestionForInsert`.

3. **Edge function `extract-questions`**: expandir `TOOL_SCHEMA.parameters.properties.questions.items.properties`:
   ```ts
   type: { type: "string", enum: [...8 tipos...] },
   payload: { type: "object", description: "Type-specific structure (see system prompt)" },
   ```
   No `OCR_SYSTEM_PROMPT`, adicionar sessão "Question types":
   ```
   - true_false: lista de afirmações com (V)/(F). payload.tf_items = [{text, marked}].
   - fill_blank: enunciado com lacunas (___ ou _____). payload.blank_placeholder, payload.expected_answer.
   - (demais tipos: ver phase 3)
   ```
   Fallback heurístico no client: regex `/\(\s*[VF]\s*\)|\(\s*\)/g` força `type: true_false` se a IA retornar `multiple_choice`. Regex `/_{3,}/g` força `fill_blank`.

4. **`TypedQuestionEditor`** (novo): `src/components/question-bank/TypedQuestionEditor.tsx`. Recebe `{ question, onChange }` e renderiza UI específica:
   - `true_false`: `<TrueFalseItemsEditor>` — lista de afirmações com toggle V/F/nulo.
   - `fill_blank`: `<FillBlankEditor>` — textarea + campo "Resposta esperada".
   - `multiple_choice`/`open_ended`: renderiza o bloco antigo (mantido pra retrocompat).
   - Demais tipos: placeholder "Em breve" (será preenchido em Phase 3).

5. **Inline review** em `QuestionBank.tsx`: substituir o bloco "Alternativas" (linhas 873-900) por `<TypedQuestionEditor question={q} onChange={(p) => updateExtractedTyped(i, p)} />`.

6. **`QuestionForm`** ([src/components/QuestionForm.tsx](../../../src/components/QuestionForm.tsx)): substituir o `<Select>` "objetiva/dissertativa" por um seletor de tipo com 4 opções (multiple_choice, open_ended, true_false, fill_blank). O corpo do form abaixo do select também usa `<TypedQuestionEditor>`.

**Testes novos:**
- `supabase/functions/extract-questions/__tests__/types.test.ts` (se houver runner) ou snapshot do prompt.
- `src/test/typed-question-editor.test.tsx`.
- `src/test/questionType-helpers.test.ts` — `inferLegacyType`, `parseQuestionRow`, `serializeQuestionForInsert`.
- `src/test/question-form-typed.test.tsx` — modal de edição com cada tipo novo.

**Critério de aceite Phase 2:**
- Migration aplicada local; `make gen-types` regenera tipos com as colunas novas.
- Extração identifica V/F e fill_blank em PDF de teste.
- Edição inline e via QuestionForm grava `type` + `payload` corretamente.
- Linhas antigas (type=NULL) continuam aparecendo e editáveis sem regressão.

---

### Phase 3 — Tipos compostos

**Escopo:** `multiple_answer`, `matching`, `ordering`, `table`.

**Mudanças:**

1. **Edge function `extract-questions`**: ampliar prompt e schema:
   ```
   - multiple_answer: alternativas com [x]/[ ] marcáveis. payload.check_items.
   - matching: pares "a -- b". payload.match_pairs.
   - ordering: itens numerados [1], [2], [3]. payload.order_items.
   - table: linhas em formato |a|b|c|. payload.table_rows = string[][].
   ```

2. **`TypedQuestionEditor`**: adicionar branches:
   - `MultipleAnswerEditor` — checkbox + Input por item.
   - `MatchingEditor` — duas colunas (left/right) com drag-and-drop opcional (reusa @dnd-kit já no projeto).
   - `OrderingEditor` — lista numerada com drag-and-drop.
   - `TableEditor` — grid editável (linhas/colunas variáveis).

3. **`QuestionForm`**: select de tipo passa a ter 8 opções.

**Testes:** um arquivo por editor novo (`matching-editor.test.tsx`, etc.).

**Critério de aceite Phase 3:**
- Cada um dos 4 tipos aparece e é editável.
- Drag-and-drop não quebra em mobile (responsividade do dnd-kit).
- Lista de questões salva no banco com `type` + `payload` correto.

---

### Phase 4 — Integração com Adaptation Wizard

**Escopo:** questões importadas do banco viajam com tipo até `adapt-activity` e o resultado preserva o tipo.

**Mudanças:**

1. **`SelectedQuestion`** ([src/types/adaptation.ts:185-193](../../../src/types/adaptation.ts#L185-L193)) ganha:
   ```ts
   type?: QuestionType;
   payload?: QuestionPayload;
   ```

2. **Wizard `StepActivityInput`** (onde o usuário importa do banco): popula os novos campos ao ler do banco.

3. **`StepAIEditor`** ([src/components/adaptation/steps/ai-editor/StepAIEditor.tsx:240-251](../../../src/components/adaptation/steps/ai-editor/StepAIEditor.tsx#L240-L251)): além de `original_activity: data.activityText`, enviar `typed_questions: data.selectedQuestions.filter(q => q.type)` no body da request.

4. **Edge function `adapt-activity`**: se `typed_questions` vier presente, converter cada uma pra DSL usando `structuredToMarkdownDsl` antes de montar o prompt. Ajustar instrução pro modelo preservar o `type` original ao adaptar.

5. **Prompt da `adapt-activity`** ganha sessão "Quando houver questões tipadas, preserve o tipo no resultado adaptado".

**Testes:** `src/test/adaptation-wizard-typed-import.test.tsx` — importa V/F do banco, gera adaptação, verifica que `result.version_universal` mantém tipo V/F.

**Critério de aceite Phase 4:**
- Questão V/F importada do banco vira V/F no resultado adaptado (não vira open_ended).
- Sem regressão pro fluxo legado (texto solto via "Tipo de atividade").

## 6. Riscos e mitigações

| Risco | Mitigação |
|------|-----------|
| Gemini 2.5 Flash errar o tipo (ex: marcar V/F como multiple_choice) | Few-shot examples no system prompt + fallback heurístico no client (regex pra `(V)/(F)` e `___`) |
| Linhas legadas (`type=NULL`) quebrarem o renderer novo | `inferLegacyType()` com fallback testado |
| UI ficar pesada com 8 tipos por card | Select de tipo no topo + corpo específico abaixo (mesmo padrão do `StepAIEditor`) |
| Migration falhar em staging/prod | Aplicar local primeiro (`supabase migration up --local`); rodar `migration-reviewer` agent antes do push |
| Edge function ficar lenta com schema maior | Tool calling com schema completo aumenta tokens; manter `temperature: 0` e `gemini-2.5-flash` |

## 7. Convenções e padrões a respeitar

- **TDD**: cada phase começa com testes vermelhos. CLAUDE.md exige Red → Green → Refactor.
- **Migration**: nunca `make sb-reset` em fluxo normal (perde o seed). Apenas `supabase migration up --local`.
- **`make db-push`**: só rodar com confirmação explícita do usuário, conforme regra de acesso a staging/produção.
- **Branch / PR**: cada phase = feature branch + PR contra `development`. Nunca push direto em `main`.
- **Arquivos protegidos**: não editar `src/components/ui/*` nem `src/integrations/supabase/types.ts` (gerado).
- **Idioma**: UI em português brasileiro (sem em dashes), código em inglês.
- **shadcn/ui**: usar componentes via CLI quando precisar de novo (ex: `npx shadcn-ui@latest add alert-dialog` se ainda não tiver).

## 8. Ordem de execução

1. Phase 1 (independente, vai sozinha pra `development`).
2. Phase 2 (depende da phase 1 estar mergeada; introduz schema novo).
3. Phase 3 (em cima da phase 2).
4. Phase 4 (em cima da phase 3, fecha o loop com a adaptação).

Cada phase deve passar `make lint`, `make test`, `make typecheck`, `make build` antes do PR.

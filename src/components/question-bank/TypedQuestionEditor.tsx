import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import {
  QUESTION_TYPES,
  QUESTION_TYPE_BANK_LABELS,
  emptyPayloadFor,
  type BankQuestionType,
  type QuestionPayload,
} from "@/lib/questionType";

export type TypedQuestionState = {
  type: BankQuestionType;
  options?: string[];
  correct_answer?: number | null;
  payload?: QuestionPayload | null;
};

export type TypedQuestionEditorProps = {
  state: TypedQuestionState;
  onChange: (patch: Partial<TypedQuestionState>) => void;
  /** Quando false, renderiza apenas leitura. */
  editing?: boolean;
  /** Esconde o selector de tipo (usado em telas onde o tipo é fixo por contexto). */
  hideTypeSelector?: boolean;
  /** Limite máximo de alternativas para multiple_choice. Default 6. */
  maxOptions?: number;
};

/**
 * Editor por tipo de questão. Centraliza o cabeçalho com seletor de tipo + corpo
 * específico (alternativas, V/F, lacunas, etc.). Para multiple_choice/open_ended,
 * o estado vive em `options`/`correct_answer` (compatível com schema legado).
 * Para os demais tipos, vive em `payload`.
 */
export default function TypedQuestionEditor({
  state,
  onChange,
  editing = true,
  hideTypeSelector = false,
  maxOptions = 6,
}: TypedQuestionEditorProps) {
  const handleTypeChange = useCallback(
    (next: BankQuestionType) => {
      if (next === state.type) return;
      if (next === "multiple_choice") {
        onChange({
          type: next,
          options: state.options ?? ["", ""],
          correct_answer: state.correct_answer ?? null,
          payload: null,
        });
        return;
      }
      if (next === "open_ended") {
        onChange({ type: next, options: undefined, correct_answer: null, payload: null });
        return;
      }
      onChange({
        type: next,
        options: undefined,
        correct_answer: null,
        payload: emptyPayloadFor(next),
      });
    },
    [onChange, state.correct_answer, state.options, state.type],
  );

  return (
    <div className="space-y-3">
      {!hideTypeSelector && (
        <div>
          <Label className="text-xs">Tipo de questão</Label>
          {editing ? (
            <Select
              value={state.type}
              onValueChange={(v) => handleTypeChange(v as BankQuestionType)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {QUESTION_TYPE_BANK_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm p-1 text-muted-foreground">
              {QUESTION_TYPE_BANK_LABELS[state.type]}
            </p>
          )}
        </div>
      )}

      <TypedBody state={state} onChange={onChange} editing={editing} maxOptions={maxOptions} />
    </div>
  );
}

function TypedBody({
  state,
  onChange,
  editing,
  maxOptions,
}: {
  state: TypedQuestionState;
  onChange: (patch: Partial<TypedQuestionState>) => void;
  editing: boolean;
  maxOptions: number;
}) {
  switch (state.type) {
    case "multiple_choice":
      return (
        <MultipleChoiceEditor
          options={state.options ?? []}
          correctAnswer={state.correct_answer ?? null}
          onChange={(options, correctAnswer) =>
            onChange({ options, correct_answer: correctAnswer })
          }
          editing={editing}
          maxOptions={maxOptions}
        />
      );
    case "open_ended":
      return (
        <p className="text-sm text-muted-foreground italic">
          Questão dissertativa — o aluno responde no espaço em branco. Sem alternativas.
        </p>
      );
    case "true_false":
      return (
        <TrueFalseEditor
          payload={extractPayload(state, "true_false")}
          onChange={(p) => onChange({ payload: p })}
          editing={editing}
        />
      );
    case "fill_blank":
      return (
        <FillBlankEditor
          payload={extractPayload(state, "fill_blank")}
          onChange={(p) => onChange({ payload: p })}
          editing={editing}
        />
      );
    case "multiple_answer":
      return (
        <MultipleAnswerEditor
          payload={extractPayload(state, "multiple_answer")}
          onChange={(p) => onChange({ payload: p })}
          editing={editing}
        />
      );
    case "matching":
      return (
        <MatchingEditor
          payload={extractPayload(state, "matching")}
          onChange={(p) => onChange({ payload: p })}
          editing={editing}
        />
      );
    case "ordering":
      return (
        <OrderingEditor
          payload={extractPayload(state, "ordering")}
          onChange={(p) => onChange({ payload: p })}
          editing={editing}
        />
      );
    case "table":
      return (
        <TableEditor
          payload={extractPayload(state, "table")}
          onChange={(p) => onChange({ payload: p })}
          editing={editing}
        />
      );
  }
}

function extractPayload<T extends BankQuestionType>(
  state: TypedQuestionState,
  expected: T,
): Extract<QuestionPayload, { type: T }> {
  if (state.payload && state.payload.type === expected) {
    return state.payload as Extract<QuestionPayload, { type: T }>;
  }
  return emptyPayloadFor(expected) as Extract<QuestionPayload, { type: T }>;
}

// ─────────────────────────── multiple_choice ───────────────────────────

function MultipleChoiceEditor({
  options,
  correctAnswer,
  onChange,
  editing,
  maxOptions,
}: {
  options: string[];
  correctAnswer: number | null;
  onChange: (options: string[], correctAnswer: number | null) => void;
  editing: boolean;
  maxOptions: number;
}) {
  const setText = (i: number, value: string) => {
    const next = [...options];
    next[i] = value;
    onChange(next, correctAnswer);
  };
  const remove = (i: number) => {
    const next = options.filter((_, j) => j !== i);
    let nextCorrect: number | null = correctAnswer;
    if (nextCorrect != null) {
      if (nextCorrect === i) nextCorrect = null;
      else if (nextCorrect > i) nextCorrect = nextCorrect - 1;
    }
    onChange(next, nextCorrect);
  };
  const add = () => {
    if (options.length >= maxOptions) return;
    onChange([...options, ""], correctAnswer);
  };

  return (
    <div>
      <Label className="text-xs">Alternativas</Label>
      <div className="space-y-1 mt-1">
        {options.map((opt, j) => (
          <div key={j} className="flex items-center gap-2">
            <Button
              size="sm"
              variant={correctAnswer === j ? "default" : "outline"}
              className="w-8 h-7 text-xs shrink-0"
              onClick={() => editing && onChange(options, correctAnswer === j ? null : j)}
              disabled={!editing}
              aria-label={`Marcar alternativa ${String.fromCharCode(65 + j)} como correta`}
            >
              {String.fromCharCode(65 + j)}
            </Button>
            {editing ? (
              <>
                <Input
                  value={opt}
                  onChange={(e) => setText(j, e.target.value)}
                  placeholder={`Texto da alternativa ${String.fromCharCode(65 + j)}`}
                  className="h-8 text-sm flex-1"
                  aria-label={`Texto da alternativa ${String.fromCharCode(65 + j)}`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(j)}
                  aria-label={`Remover alternativa ${String.fromCharCode(65 + j)}`}
                  title="Remover alternativa"
                  className="h-7 w-7 shrink-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <span
                className={`text-sm ${
                  correctAnswer === j ? "font-semibold text-primary" : "text-muted-foreground"
                }`}
              >
                {opt}
              </span>
            )}
          </div>
        ))}
      </div>
      {editing && options.length < maxOptions && (
        <Button size="sm" variant="outline" onClick={add} className="mt-2">
          <Plus className="w-3 h-3 mr-1" /> Adicionar alternativa
        </Button>
      )}
      {editing && options.length > 0 && correctAnswer == null && (
        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Sem gabarito definido. Clique na letra correta.
        </p>
      )}
    </div>
  );
}

// ─────────────────────────── true_false ───────────────────────────

function TrueFalseEditor({
  payload,
  onChange,
  editing,
}: {
  payload: Extract<QuestionPayload, { type: "true_false" }>;
  onChange: (next: Extract<QuestionPayload, { type: "true_false" }>) => void;
  editing: boolean;
}) {
  const setItem = (i: number, patch: Partial<{ text: string; marked: boolean | null }>) => {
    const items = payload.tf_items.map((it, j) => (j === i ? { ...it, ...patch } : it));
    onChange({ type: "true_false", tf_items: items });
  };
  const remove = (i: number) => {
    onChange({ type: "true_false", tf_items: payload.tf_items.filter((_, j) => j !== i) });
  };
  const add = () => {
    onChange({
      type: "true_false",
      tf_items: [...payload.tf_items, { text: "", marked: null }],
    });
  };

  return (
    <div>
      <Label className="text-xs">Afirmações (V/F)</Label>
      <div className="space-y-2 mt-1">
        {payload.tf_items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex flex-col gap-1 shrink-0">
              <Button
                size="sm"
                variant={item.marked === true ? "default" : "outline"}
                className="h-7 w-9 text-xs"
                onClick={() => editing && setItem(i, { marked: item.marked === true ? null : true })}
                disabled={!editing}
                aria-label={`Marcar afirmação ${i + 1} como verdadeira`}
              >
                V
              </Button>
              <Button
                size="sm"
                variant={item.marked === false ? "default" : "outline"}
                className="h-7 w-9 text-xs"
                onClick={() => editing && setItem(i, { marked: item.marked === false ? null : false })}
                disabled={!editing}
                aria-label={`Marcar afirmação ${i + 1} como falsa`}
              >
                F
              </Button>
            </div>
            {editing ? (
              <>
                <Textarea
                  value={item.text}
                  onChange={(e) => setItem(i, { text: e.target.value })}
                  placeholder={`Afirmação ${i + 1}`}
                  className="text-sm flex-1 min-h-[2.5rem]"
                  rows={2}
                  aria-label={`Texto da afirmação ${i + 1}`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(i)}
                  aria-label={`Remover afirmação ${i + 1}`}
                  title="Remover afirmação"
                  className="h-7 w-7 shrink-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <p className="text-sm flex-1 leading-relaxed">{item.text}</p>
            )}
          </div>
        ))}
      </div>
      {editing && (
        <Button size="sm" variant="outline" onClick={add} className="mt-2">
          <Plus className="w-3 h-3 mr-1" /> Adicionar afirmação
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────── fill_blank ───────────────────────────

function FillBlankEditor({
  payload,
  onChange,
  editing,
}: {
  payload: Extract<QuestionPayload, { type: "fill_blank" }>;
  onChange: (next: Extract<QuestionPayload, { type: "fill_blank" }>) => void;
  editing: boolean;
}) {
  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs">Placeholder da lacuna (no enunciado)</Label>
        {editing ? (
          <Input
            value={payload.blank_placeholder}
            onChange={(e) =>
              onChange({
                type: "fill_blank",
                blank_placeholder: e.target.value,
                expected_answer: payload.expected_answer,
              })
            }
            placeholder="Ex: ___  ou  _____"
            className="h-8 text-sm"
          />
        ) : (
          <p className="text-sm p-1 text-muted-foreground">
            {payload.blank_placeholder || "—"}
          </p>
        )}
      </div>
      <div>
        <Label className="text-xs">Resposta esperada (opcional)</Label>
        {editing ? (
          <Input
            value={payload.expected_answer ?? ""}
            onChange={(e) =>
              onChange({
                type: "fill_blank",
                blank_placeholder: payload.blank_placeholder,
                expected_answer: e.target.value || undefined,
              })
            }
            placeholder="Resposta correta para o gabarito"
            className="h-8 text-sm"
          />
        ) : (
          <p className="text-sm p-1 text-muted-foreground">
            {payload.expected_answer || "—"}
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── multiple_answer ───────────────────────────

function MultipleAnswerEditor({
  payload,
  onChange,
  editing,
}: {
  payload: Extract<QuestionPayload, { type: "multiple_answer" }>;
  onChange: (next: Extract<QuestionPayload, { type: "multiple_answer" }>) => void;
  editing: boolean;
}) {
  const setItem = (i: number, patch: Partial<{ text: string; checked: boolean }>) => {
    const items = payload.check_items.map((it, j) => (j === i ? { ...it, ...patch } : it));
    onChange({ type: "multiple_answer", check_items: items });
  };
  const remove = (i: number) => {
    onChange({
      type: "multiple_answer",
      check_items: payload.check_items.filter((_, j) => j !== i),
    });
  };
  const add = () => {
    onChange({
      type: "multiple_answer",
      check_items: [...payload.check_items, { text: "", checked: false }],
    });
  };

  return (
    <div>
      <Label className="text-xs">Itens (marque os corretos)</Label>
      <div className="space-y-1 mt-1">
        {payload.check_items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Button
              size="sm"
              variant={item.checked ? "default" : "outline"}
              className="w-9 h-7 text-xs shrink-0"
              onClick={() => editing && setItem(i, { checked: !item.checked })}
              disabled={!editing}
              aria-label={`${item.checked ? "Desmarcar" : "Marcar"} item ${i + 1}`}
            >
              {item.checked ? "[x]" : "[ ]"}
            </Button>
            {editing ? (
              <>
                <Input
                  value={item.text}
                  onChange={(e) => setItem(i, { text: e.target.value })}
                  placeholder={`Item ${i + 1}`}
                  className="h-8 text-sm flex-1"
                  aria-label={`Texto do item ${i + 1}`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(i)}
                  aria-label={`Remover item ${i + 1}`}
                  title="Remover item"
                  className="h-7 w-7 shrink-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <span
                className={`text-sm ${item.checked ? "font-semibold text-primary" : "text-muted-foreground"}`}
              >
                {item.text}
              </span>
            )}
          </div>
        ))}
      </div>
      {editing && (
        <Button size="sm" variant="outline" onClick={add} className="mt-2">
          <Plus className="w-3 h-3 mr-1" /> Adicionar item
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────── matching ───────────────────────────

function MatchingEditor({
  payload,
  onChange,
  editing,
}: {
  payload: Extract<QuestionPayload, { type: "matching" }>;
  onChange: (next: Extract<QuestionPayload, { type: "matching" }>) => void;
  editing: boolean;
}) {
  const setPair = (i: number, patch: Partial<{ left: string; right: string }>) => {
    const next = payload.match_pairs.map((p, j) => (j === i ? { ...p, ...patch } : p));
    onChange({ type: "matching", match_pairs: next });
  };
  const remove = (i: number) => {
    onChange({ type: "matching", match_pairs: payload.match_pairs.filter((_, j) => j !== i) });
  };
  const add = () => {
    onChange({
      type: "matching",
      match_pairs: [...payload.match_pairs, { left: "", right: "" }],
    });
  };

  return (
    <div>
      <Label className="text-xs">Pares para associar</Label>
      <div className="space-y-1 mt-1">
        {payload.match_pairs.map((pair, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-6 shrink-0">{i + 1}.</span>
            {editing ? (
              <>
                <Input
                  value={pair.left}
                  onChange={(e) => setPair(i, { left: e.target.value })}
                  placeholder="Lado esquerdo"
                  className="h-8 text-sm flex-1"
                  aria-label={`Lado esquerdo do par ${i + 1}`}
                />
                <span className="text-muted-foreground">↔</span>
                <Input
                  value={pair.right}
                  onChange={(e) => setPair(i, { right: e.target.value })}
                  placeholder="Lado direito"
                  className="h-8 text-sm flex-1"
                  aria-label={`Lado direito do par ${i + 1}`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(i)}
                  aria-label={`Remover par ${i + 1}`}
                  className="h-7 w-7 shrink-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <p className="text-sm flex-1">
                <span className="font-medium">{pair.left}</span>
                <span className="text-muted-foreground"> ↔ </span>
                <span>{pair.right}</span>
              </p>
            )}
          </div>
        ))}
      </div>
      {editing && (
        <Button size="sm" variant="outline" onClick={add} className="mt-2">
          <Plus className="w-3 h-3 mr-1" /> Adicionar par
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────── ordering ───────────────────────────

function OrderingEditor({
  payload,
  onChange,
  editing,
}: {
  payload: Extract<QuestionPayload, { type: "ordering" }>;
  onChange: (next: Extract<QuestionPayload, { type: "ordering" }>) => void;
  editing: boolean;
}) {
  const setItem = (i: number, text: string) => {
    const next = payload.order_items.map((it, j) => (j === i ? { ...it, text } : it));
    onChange({ type: "ordering", order_items: next });
  };
  const move = (i: number, dir: -1 | 1) => {
    const target = i + dir;
    if (target < 0 || target >= payload.order_items.length) return;
    const next = [...payload.order_items];
    [next[i], next[target]] = [next[target], next[i]];
    onChange({ type: "ordering", order_items: next.map((it, idx) => ({ ...it, n: idx + 1 })) });
  };
  const remove = (i: number) => {
    const next = payload.order_items
      .filter((_, j) => j !== i)
      .map((it, idx) => ({ ...it, n: idx + 1 }));
    onChange({ type: "ordering", order_items: next });
  };
  const add = () => {
    onChange({
      type: "ordering",
      order_items: [
        ...payload.order_items,
        { n: payload.order_items.length + 1, text: "" },
      ],
    });
  };

  return (
    <div>
      <Label className="text-xs">Itens para ordenar</Label>
      <div className="space-y-1 mt-1">
        {payload.order_items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs font-medium w-6 shrink-0">[{item.n}]</span>
            {editing ? (
              <>
                <Input
                  value={item.text}
                  onChange={(e) => setItem(i, e.target.value)}
                  placeholder={`Item ${item.n}`}
                  className="h-8 text-sm flex-1"
                  aria-label={`Texto do item ${item.n}`}
                />
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Mover item ${item.n} para cima`}
                    title="Mover para cima"
                    className="h-7 w-7"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => move(i, 1)}
                    disabled={i === payload.order_items.length - 1}
                    aria-label={`Mover item ${item.n} para baixo`}
                    title="Mover para baixo"
                    className="h-7 w-7"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(i)}
                    aria-label={`Remover item ${item.n}`}
                    className="h-7 w-7"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm flex-1">{item.text}</p>
            )}
          </div>
        ))}
      </div>
      {editing && (
        <Button size="sm" variant="outline" onClick={add} className="mt-2">
          <Plus className="w-3 h-3 mr-1" /> Adicionar item
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────── table ───────────────────────────

function TableEditor({
  payload,
  onChange,
  editing,
}: {
  payload: Extract<QuestionPayload, { type: "table" }>;
  onChange: (next: Extract<QuestionPayload, { type: "table" }>) => void;
  editing: boolean;
}) {
  const rows = payload.table_rows;
  const colCount = Math.max(1, ...rows.map((r) => r.length));

  const setCell = (ri: number, ci: number, value: string) => {
    const next = rows.map((r, j) => {
      if (j !== ri) return r;
      const copy = [...r];
      while (copy.length <= ci) copy.push("");
      copy[ci] = value;
      return copy;
    });
    onChange({ type: "table", table_rows: next });
  };
  const addRow = () => {
    onChange({
      type: "table",
      table_rows: [...rows, new Array(colCount).fill("")],
    });
  };
  const removeRow = (ri: number) => {
    onChange({ type: "table", table_rows: rows.filter((_, j) => j !== ri) });
  };
  const addColumn = () => {
    onChange({
      type: "table",
      table_rows: rows.map((r) => [...r, ""]),
    });
  };
  const removeColumn = (ci: number) => {
    onChange({
      type: "table",
      table_rows: rows.map((r) => r.filter((_, j) => j !== ci)),
    });
  };

  return (
    <div>
      <Label className="text-xs">Tabela</Label>
      <div className="overflow-x-auto mt-1">
        <table className="border-collapse text-sm">
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {Array.from({ length: colCount }).map((_, ci) => (
                  <td key={ci} className="border border-border p-1 min-w-[6rem]">
                    {editing ? (
                      <Input
                        value={row[ci] ?? ""}
                        onChange={(e) => setCell(ri, ci, e.target.value)}
                        className="h-7 text-sm border-0 focus-visible:ring-1"
                        aria-label={`Célula linha ${ri + 1} coluna ${ci + 1}`}
                      />
                    ) : (
                      <span className="px-1">{row[ci] ?? ""}</span>
                    )}
                  </td>
                ))}
                {editing && (
                  <td className="p-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeRow(ri)}
                      aria-label={`Remover linha ${ri + 1}`}
                      className="h-7 w-7"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {editing && (
              <tr>
                {Array.from({ length: colCount }).map((_, ci) => (
                  <td key={ci} className="p-1 text-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeColumn(ci)}
                      aria-label={`Remover coluna ${ci + 1}`}
                      className="h-6 w-6"
                      title="Remover coluna"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="w-3 h-3 mr-1" /> Linha
          </Button>
          <Button size="sm" variant="outline" onClick={addColumn}>
            <Plus className="w-3 h-3 mr-1" /> Coluna
          </Button>
        </div>
      )}
    </div>
  );
}

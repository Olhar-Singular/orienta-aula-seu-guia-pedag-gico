import type {
  CheckItem,
  TrueFalseItem,
  MatchPair,
  OrderItem,
} from "@/types/adaptation";

export const QUESTION_TYPES = [
  "multiple_choice",
  "multiple_answer",
  "open_ended",
  "fill_blank",
  "true_false",
  "matching",
  "ordering",
  "table",
] as const;

export type BankQuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_BANK_LABELS: Record<BankQuestionType, string> = {
  multiple_choice: "Múltipla Escolha",
  multiple_answer: "Múltipla Resposta",
  open_ended: "Dissertativa",
  fill_blank: "Completar Lacunas",
  true_false: "Verdadeiro ou Falso",
  matching: "Associar Colunas",
  ordering: "Ordenar",
  table: "Tabela",
};

export type FillBlankPayload = {
  blank_placeholder: string;
  expected_answer?: string;
};

export type TruefalsePayload = {
  tf_items: TrueFalseItem[];
};

export type MultipleAnswerPayload = {
  check_items: CheckItem[];
};

export type MatchingPayload = {
  match_pairs: MatchPair[];
};

export type OrderingPayload = {
  order_items: OrderItem[];
};

export type TablePayload = {
  table_rows: string[][];
};

export type QuestionPayload =
  | ({ type: "multiple_choice" })
  | ({ type: "open_ended" })
  | ({ type: "multiple_answer" } & MultipleAnswerPayload)
  | ({ type: "fill_blank" } & FillBlankPayload)
  | ({ type: "true_false" } & TruefalsePayload)
  | ({ type: "matching" } & MatchingPayload)
  | ({ type: "ordering" } & OrderingPayload)
  | ({ type: "table" } & TablePayload);

type LegacyRow = {
  type: string | null;
  options: unknown;
};

export function isBankQuestionType(value: unknown): value is BankQuestionType {
  return typeof value === "string" && (QUESTION_TYPES as readonly string[]).includes(value);
}

/**
 * Linhas antigas (anteriores à migration de tipo) ficam com type=NULL.
 * Inferimos o tipo a partir da presença de options: array não vazio → multiple_choice;
 * caso contrário → open_ended.
 */
export function inferLegacyType(row: LegacyRow): BankQuestionType {
  if (isBankQuestionType(row.type)) return row.type;
  return Array.isArray(row.options) && row.options.length > 0 ? "multiple_choice" : "open_ended";
}

/**
 * Heurística leve no client para corrigir classificações erradas da IA.
 * Roda *depois* da extração e *antes* de exibir, sem mudar o texto original.
 */
export function refineTypeHeuristic(args: {
  type?: string | null;
  text: string;
  options?: unknown;
}): BankQuestionType {
  const text = args.text ?? "";
  // Padrões V/F: "(V)", "(F)", "( )" (lacuna pra marcar V/F), "verdadeiro ou falso", "v ou f"
  if (/\(\s*[vfVF]?\s*\)|\bverdadeiro\s+ou\s+falso\b|\bv\s+ou\s+f\b/i.test(text)) {
    return "true_false";
  }
  // Padrão de lacunas: 3 ou mais underscores
  if (/_{3,}/.test(text)) {
    return "fill_blank";
  }
  if (isBankQuestionType(args.type)) return args.type;
  return Array.isArray(args.options) && args.options.length > 0 ? "multiple_choice" : "open_ended";
}

/**
 * Valida e normaliza o payload bruto vindo da IA (ou do banco) para o discriminated union.
 * Retorna null se incompatível com o tipo.
 */
export function parsePayload(type: BankQuestionType, raw: unknown): QuestionPayload | null {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  switch (type) {
    case "multiple_choice":
    case "open_ended":
      return { type };

    case "fill_blank": {
      const placeholder = typeof data.blank_placeholder === "string" ? data.blank_placeholder : "";
      const expected = typeof data.expected_answer === "string" ? data.expected_answer : undefined;
      return { type, blank_placeholder: placeholder, expected_answer: expected };
    }

    case "true_false": {
      const items = Array.isArray(data.tf_items) ? data.tf_items : [];
      const tf_items: TrueFalseItem[] = items
        .filter((it): it is Record<string, unknown> => it !== null && typeof it === "object")
        .map((it) => ({
          text: typeof it.text === "string" ? it.text : "",
          marked:
            it.marked === true ? true
            : it.marked === false ? false
            : null,
        }));
      return { type, tf_items };
    }

    case "multiple_answer": {
      const items = Array.isArray(data.check_items) ? data.check_items : [];
      const check_items: CheckItem[] = items
        .filter((it): it is Record<string, unknown> => it !== null && typeof it === "object")
        .map((it) => ({
          text: typeof it.text === "string" ? it.text : "",
          checked: it.checked === true,
        }));
      return { type, check_items };
    }

    case "matching": {
      const items = Array.isArray(data.match_pairs) ? data.match_pairs : [];
      const match_pairs: MatchPair[] = items
        .filter((it): it is Record<string, unknown> => it !== null && typeof it === "object")
        .map((it) => ({
          left: typeof it.left === "string" ? it.left : "",
          right: typeof it.right === "string" ? it.right : "",
        }));
      return { type, match_pairs };
    }

    case "ordering": {
      const items = Array.isArray(data.order_items) ? data.order_items : [];
      const order_items: OrderItem[] = items
        .filter((it): it is Record<string, unknown> => it !== null && typeof it === "object")
        .map((it, i) => ({
          n: typeof it.n === "number" ? it.n : i + 1,
          text: typeof it.text === "string" ? it.text : "",
        }));
      return { type, order_items };
    }

    case "table": {
      const rows = Array.isArray(data.table_rows) ? data.table_rows : [];
      const table_rows: string[][] = rows
        .filter((r): r is unknown[] => Array.isArray(r))
        .map((r) => r.map((c) => (typeof c === "string" ? c : String(c ?? ""))));
      return { type, table_rows };
    }
  }
}

/**
 * Cria payload vazio padrão para um tipo (para inicializar editores ao trocar de tipo).
 */
export function emptyPayloadFor(type: BankQuestionType): QuestionPayload {
  switch (type) {
    case "multiple_choice":
    case "open_ended":
      return { type };
    case "fill_blank":
      return { type, blank_placeholder: "" };
    case "true_false":
      return { type, tf_items: [{ text: "", marked: null }] };
    case "multiple_answer":
      return { type, check_items: [{ text: "", checked: false }] };
    case "matching":
      return { type, match_pairs: [{ left: "", right: "" }] };
    case "ordering":
      return { type, order_items: [{ n: 1, text: "" }] };
    case "table":
      return { type, table_rows: [["", ""]] };
  }
}

/**
 * Serializa o payload de um tipo novo para o jsonb. Tipos legados retornam null.
 */
export function serializePayloadForDb(payload: QuestionPayload | null | undefined): unknown {
  if (!payload) return null;
  switch (payload.type) {
    case "multiple_choice":
    case "open_ended":
      return null;
    case "fill_blank":
      return {
        blank_placeholder: payload.blank_placeholder,
        expected_answer: payload.expected_answer ?? null,
      };
    case "true_false":
      return { tf_items: payload.tf_items };
    case "multiple_answer":
      return { check_items: payload.check_items };
    case "matching":
      return { match_pairs: payload.match_pairs };
    case "ordering":
      return { order_items: payload.order_items };
    case "table":
      return { table_rows: payload.table_rows };
  }
}

/**
 * Renderiza uma questão (statement + payload) como texto plano para alimentar a IA
 * (adapt-activity etc.). Cada tipo é serializado com marcação específica para que o
 * modelo identifique o tipo no input e preserve no output.
 */
export function renderQuestionForAi(args: {
  text: string;
  type?: string | null;
  options?: unknown;
  correct_answer?: number | null;
  payload?: unknown;
  prefix?: string;
}): string {
  const { text, prefix = "" } = args;
  const resolvedType = inferLegacyType({ type: args.type ?? null, options: args.options });
  const head = prefix ? `${prefix} ` : "";

  switch (resolvedType) {
    case "multiple_choice": {
      const opts = Array.isArray(args.options) ? args.options : [];
      const optsStr = opts
        .map((o, j) => `   ${String.fromCharCode(65 + j)}) ${o}`)
        .join("\n");
      const gabarito =
        typeof args.correct_answer === "number" && args.correct_answer >= 0
          ? `\n   [Gabarito: ${String.fromCharCode(65 + args.correct_answer)}]`
          : "";
      return `${head}${text}${optsStr ? "\n" + optsStr : ""}${gabarito}`;
    }
    case "open_ended":
      return `${head}${text}`;

    case "true_false": {
      const parsed = parsePayload("true_false", args.payload);
      const items = parsed?.type === "true_false" ? parsed.tf_items : [];
      const lines = items
        .map((it, j) => {
          const marker = it.marked === true ? "(V)" : it.marked === false ? "(F)" : "( )";
          return `   ${marker} ${it.text}`;
        })
        .join("\n");
      return `${head}${text}${lines ? "\n[Verdadeiro/Falso]\n" + lines : ""}`;
    }
    case "fill_blank": {
      const parsed = parsePayload("fill_blank", args.payload);
      const placeholder = parsed?.type === "fill_blank" ? parsed.blank_placeholder : "___";
      const expected = parsed?.type === "fill_blank" ? parsed.expected_answer : undefined;
      return `${head}${text} [Lacuna: ${placeholder}${expected ? ` | Resposta: ${expected}` : ""}]`;
    }
    case "multiple_answer": {
      const parsed = parsePayload("multiple_answer", args.payload);
      const items = parsed?.type === "multiple_answer" ? parsed.check_items : [];
      const lines = items
        .map((it) => `   ${it.checked ? "[x]" : "[ ]"} ${it.text}`)
        .join("\n");
      return `${head}${text}${lines ? "\n[Múltipla Resposta]\n" + lines : ""}`;
    }
    case "matching": {
      const parsed = parsePayload("matching", args.payload);
      const pairs = parsed?.type === "matching" ? parsed.match_pairs : [];
      const lines = pairs.map((p, j) => `   ${j + 1}. ${p.left} -- ${p.right}`).join("\n");
      return `${head}${text}${lines ? "\n[Associar Colunas]\n" + lines : ""}`;
    }
    case "ordering": {
      const parsed = parsePayload("ordering", args.payload);
      const items = parsed?.type === "ordering" ? parsed.order_items : [];
      const lines = items.map((it) => `   [${it.n}] ${it.text}`).join("\n");
      return `${head}${text}${lines ? "\n[Ordenar]\n" + lines : ""}`;
    }
    case "table": {
      const parsed = parsePayload("table", args.payload);
      const rows = parsed?.type === "table" ? parsed.table_rows : [];
      const lines = rows.map((r) => `   | ${r.join(" | ")} |`).join("\n");
      return `${head}${text}${lines ? "\n[Tabela]\n" + lines : ""}`;
    }
  }
}

import { describe, it, expect } from "vitest";
import { parseActivity } from "@/lib/activityParser";
import { markdownDslToStructured } from "@/lib/activityDslConverter";
import { toEditableActivity } from "@/lib/pdf/editableActivity";
import type { ActivityHeader } from "@/types/adaptation";

const HEADER: ActivityHeader = {
  schoolName: "E",
  subject: "S",
  teacherName: "T",
  className: "C",
  date: "D",
  showStudentLine: false,
};

const USER_DSL = `4) Enunciado da questão
a) Primeira opção
b*) Opção correta
c) Terceira opção
d) Quarta opção

5) Selecione **todas** as corretas:
[x] Opção correta 1
[ ] Opção errada
[x] Opção correta 2
[ ] Outra errada

6) Explique com suas palavras:
[linhas:5]

7) Marque Verdadeiro ou Falso:
( ) Primeira afirmação
( ) Segunda afirmação
( ) Terceira afirmação

8) Associe as colunas:
Brasil -- Brasília
Argentina -- Buenos Aires
Chile -- Santiago

9) Ordene do menor para o maior:
[1] Célula
[2] Tecido
[3] Órgão
[4] Sistema

10) Marque a resposta correta para cada item:
| | Sim | Não | Talvez |
| Item 1 | ( ) | ( ) | ( ) |
| Item 2 | ( ) | ( ) | ( ) |
| Item 3 | ( ) | ( ) | ( ) |`;

describe("end-to-end pipeline: DSL → Structured → Editable for 7 question types", () => {
  const structured = markdownDslToStructured(USER_DSL);
  const editable = toEditableActivity(structured, HEADER);
  const byNumber = new Map(editable.questions.map((q) => [q.number, q]));

  it("parser detects correct type for each question", () => {
    const parsed = parseActivity(USER_DSL);
    const types: Record<number, string> = {};
    for (const s of parsed.sections) {
      for (const it of s.items) {
        if (it.kind === "question") types[it.data.number] = it.data.type;
      }
    }
    expect(types).toEqual({
      4: "multiple_choice",
      5: "multiple_answer",
      6: "open_ended",
      7: "true_false",
      8: "matching",
      9: "ordering",
      10: "table",
    });
  });

  it("Q4 preserves correct alternative marker", () => {
    const q = structured.sections[0].questions.find((x) => x.number === 4)!;
    expect(q.type).toBe("multiple_choice");
    expect(q.alternatives).toHaveLength(4);
    expect(q.alternatives!.find((a) => a.letter === "b")!.is_correct).toBe(true);
  });

  it("Q5 multiple_answer preserves check states", () => {
    const q = byNumber.get(5)!;
    expect(q.questionType).toBe("multiple_answer");
    expect(q.checkItems).toHaveLength(4);
    expect(q.checkItems!.map((c) => c.checked)).toEqual([true, false, true, false]);
  });

  it("Q6 open_ended preserves answer lines", () => {
    const q = byNumber.get(6)!;
    expect(q.questionType).toBe("open_ended");
    expect(q.answerLines).toBe(5);
  });

  it("Q7 true_false has 3 unmarked items", () => {
    const q = byNumber.get(7)!;
    expect(q.questionType).toBe("true_false");
    expect(q.tfItems).toHaveLength(3);
    expect(q.tfItems!.every((t) => t.marked === null)).toBe(true);
  });

  it("Q8 matching preserves all 3 pairs", () => {
    const q = byNumber.get(8)!;
    expect(q.questionType).toBe("matching");
    expect(q.matchPairs).toEqual([
      { left: "Brasil", right: "Brasília" },
      { left: "Argentina", right: "Buenos Aires" },
      { left: "Chile", right: "Santiago" },
    ]);
  });

  it("Q9 ordering preserves numbers and text", () => {
    const q = byNumber.get(9)!;
    expect(q.questionType).toBe("ordering");
    expect(q.orderItems).toEqual([
      { n: 1, text: "Célula" },
      { n: 2, text: "Tecido" },
      { n: 3, text: "Órgão" },
      { n: 4, text: "Sistema" },
    ]);
  });

  it("Q10 table has 4 rows with 4 cells each (header row has empty first cell)", () => {
    const q = byNumber.get(10)!;
    expect(q.questionType).toBe("table");
    expect(q.tableRows).toHaveLength(4);
    expect(q.tableRows![0]).toEqual(["", "Sim", "Não", "Talvez"]);
    expect(q.tableRows![1]).toEqual(["Item 1", "( )", "( )", "( )"]);
    expect(q.tableRows![2]).toEqual(["Item 2", "( )", "( )", "( )"]);
    expect(q.tableRows![3]).toEqual(["Item 3", "( )", "( )", "( )"]);
  });

  it("Q5 statement preserves bold markdown for rich rendering", () => {
    const q = byNumber.get(5)!;
    const textBlock = q.content.find((b) => b.type === "text");
    expect(textBlock?.type).toBe("text");
    if (textBlock?.type === "text") {
      expect(textBlock.content).toContain("**todas**");
      expect(textBlock.richContent).toBeDefined();
      expect(textBlock.richContent!.some((r) => r.bold && r.text === "todas")).toBe(true);
    }
  });
});

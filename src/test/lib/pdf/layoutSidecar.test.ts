import { describe, it, expect } from "vitest";
import {
  applySidecar,
  extractSidecar,
  reconcileWordColors,
  reconcileSidecar,
  emptySidecar,
  type LayoutSidecar,
} from "@/lib/pdf/layoutSidecar";
import type { EditableActivity } from "@/lib/pdf/editableActivity";
import type { ActivityHeader, StructuredActivity } from "@/types/adaptation";

const HEADER: ActivityHeader = {
  schoolName: "Escola",
  subject: "Matematica",
  teacherName: "Prof.",
  className: "5A",
  date: "16/04/2026",
  showStudentLine: true,
};

function makeActivity(): EditableActivity {
  return {
    header: HEADER,
    globalShowSeparators: false,
    questions: [
      {
        id: "q-a",
        number: 1,
        content: [{ id: "cb-a1", type: "text", content: "Questao um" }],
      },
      {
        id: "q-b",
        number: 2,
        content: [{ id: "cb-b1", type: "text", content: "Questao dois" }],
      },
    ],
  };
}

describe("applySidecar", () => {
  it("merges spacingAfter/showSeparator/alternativeIndent onto matching questions", () => {
    const activity = makeActivity();
    const sidecar: LayoutSidecar = {
      version: 1,
      questions: {
        "q-a": { spacingAfter: 40, showSeparator: true, alternativeIndent: 24 },
      },
    };

    const merged = applySidecar(activity, sidecar);
    expect(merged.questions[0].spacingAfter).toBe(40);
    expect(merged.questions[0].showSeparator).toBe(true);
    expect(merged.questions[0].alternativeIndent).toBe(24);
  });

  it("leaves questions not mentioned in sidecar unchanged", () => {
    const activity = makeActivity();
    const sidecar: LayoutSidecar = {
      version: 1,
      questions: { "q-a": { spacingAfter: 40 } },
    };

    const merged = applySidecar(activity, sidecar);
    expect(merged.questions[1].spacingAfter).toBeUndefined();
    expect(merged.questions[1].showSeparator).toBeUndefined();
  });

  it("applies globalShowSeparators", () => {
    const activity = makeActivity();
    const sidecar: LayoutSidecar = {
      version: 1,
      globalShowSeparators: true,
      questions: {},
    };
    const merged = applySidecar(activity, sidecar);
    expect(merged.globalShowSeparators).toBe(true);
  });

  it("does not mutate the input activity", () => {
    const activity = makeActivity();
    const before = structuredClone(activity);
    const sidecar: LayoutSidecar = {
      version: 1,
      questions: { "q-a": { spacingAfter: 40 } },
    };
    applySidecar(activity, sidecar);
    expect(activity).toEqual(before);
  });

  it("silently drops sidecar entries for question ids that no longer exist", () => {
    const activity = makeActivity();
    const sidecar: LayoutSidecar = {
      version: 1,
      questions: {
        "q-a": { spacingAfter: 40 },
        "q-ghost": { spacingAfter: 99 },
      },
    };
    const merged = applySidecar(activity, sidecar);
    expect(merged.questions).toHaveLength(2);
    expect(merged.questions.find((q) => q.id === "q-ghost")).toBeUndefined();
  });

  it("re-colors words in text blocks according to wordColors entries", () => {
    const activity: EditableActivity = {
      header: HEADER,
      globalShowSeparators: false,
      questions: [
        {
          id: "q-a",
          number: 1,
          content: [
            {
              id: "cb-1",
              type: "text",
              content: "O Brasil e o Paraguai fazem fronteira.",
            },
          ],
        },
      ],
    };
    const sidecar: LayoutSidecar = {
      version: 1,
      questions: {
        "q-a": {
          wordColors: [
            { blockId: "cb-1", word: "Brasil", occurrence: 0, color: "#00F" },
            { blockId: "cb-1", word: "Paraguai", occurrence: 0, color: "#F00" },
          ],
        },
      },
    };

    const merged = applySidecar(activity, sidecar);
    const textBlock = merged.questions[0].content[0];
    expect(textBlock.type).toBe("text");
    if (textBlock.type !== "text") return;

    expect(textBlock.richContent).toBeDefined();
    const coloredRuns = textBlock.richContent!.filter((r) => r.color);
    const brazil = coloredRuns.find((r) => r.text === "Brasil");
    const paraguai = coloredRuns.find((r) => r.text === "Paraguai");
    expect(brazil?.color).toBe("#00F");
    expect(paraguai?.color).toBe("#F00");
  });
});

describe("extractSidecar", () => {
  it("extracts spacingAfter/showSeparator/alternativeIndent per question", () => {
    const activity: EditableActivity = {
      header: HEADER,
      globalShowSeparators: true,
      questions: [
        {
          id: "q-a",
          number: 1,
          content: [{ id: "cb-1", type: "text", content: "Q1" }],
          spacingAfter: 50,
          showSeparator: true,
          alternativeIndent: 16,
        },
        {
          id: "q-b",
          number: 2,
          content: [{ id: "cb-2", type: "text", content: "Q2" }],
        },
      ],
    };

    const sidecar = extractSidecar(activity);
    expect(sidecar.version).toBe(1);
    expect(sidecar.globalShowSeparators).toBe(true);
    expect(sidecar.questions["q-a"]).toMatchObject({
      spacingAfter: 50,
      showSeparator: true,
      alternativeIndent: 16,
    });
    expect(sidecar.questions["q-b"]).toBeUndefined();
  });

  it("extracts wordColors from richContent with color runs", () => {
    const activity: EditableActivity = {
      header: HEADER,
      globalShowSeparators: false,
      questions: [
        {
          id: "q-a",
          number: 1,
          content: [
            {
              id: "cb-1",
              type: "text",
              content: "O Brasil e o Paraguai.",
              richContent: [
                { text: "O " },
                { text: "Brasil", color: "#00F" },
                { text: " e o " },
                { text: "Paraguai", color: "#F00" },
                { text: "." },
              ],
            },
          ],
        },
      ],
    };

    const sidecar = extractSidecar(activity);
    const wc = sidecar.questions["q-a"]?.wordColors ?? [];
    expect(wc).toHaveLength(2);
    expect(wc.find((c) => c.word === "Brasil")?.color).toBe("#00F");
    expect(wc.find((c) => c.word === "Paraguai")?.color).toBe("#F00");
  });

  it("round-trips apply -> extract -> apply with equal sidecar", () => {
    const activity = makeActivity();
    const sidecar: LayoutSidecar = {
      version: 1,
      globalShowSeparators: false,
      questions: { "q-a": { spacingAfter: 30, showSeparator: true } },
    };
    const merged = applySidecar(activity, sidecar);
    const extracted = extractSidecar(merged);
    expect(extracted.questions["q-a"]).toMatchObject({
      spacingAfter: 30,
      showSeparator: true,
    });
  });
});

describe("reconcileWordColors", () => {
  it("keeps entries whose word is still present in the new text", () => {
    const prev = [
      { blockId: "cb-1", word: "Brasil", occurrence: 0, color: "#00F" },
      { blockId: "cb-1", word: "Paraguai", occurrence: 0, color: "#F00" },
    ];
    const next = reconcileWordColors(
      "O Brasil e o Paraguai fazem fronteira.",
      prev,
    );
    expect(next).toHaveLength(2);
    expect(next.map((c) => c.word)).toEqual(["Brasil", "Paraguai"]);
  });

  it("drops entries whose word disappeared from the new text", () => {
    const prev = [
      { blockId: "cb-1", word: "Brasil", occurrence: 0, color: "#00F" },
      { blockId: "cb-1", word: "Paraguai", occurrence: 0, color: "#F00" },
    ];
    const next = reconcileWordColors(
      "O Brasil e o Peru fazem fronteira.",
      prev,
    );
    expect(next).toHaveLength(1);
    expect(next[0].word).toBe("Brasil");
  });

  it("handles multiple occurrences: keeps survivors with shifted occurrence index", () => {
    const prev = [
      { blockId: "cb-1", word: "casa", occurrence: 0, color: "#00F" },
      { blockId: "cb-1", word: "casa", occurrence: 1, color: "#F00" },
    ];
    const next = reconcileWordColors("A casa e a casa nova.", prev);
    expect(next).toHaveLength(2);
    expect(next.find((c) => c.occurrence === 0)?.color).toBe("#00F");
    expect(next.find((c) => c.occurrence === 1)?.color).toBe("#F00");
  });

  it("drops occurrence that no longer exists (word count went down)", () => {
    const prev = [
      { blockId: "cb-1", word: "casa", occurrence: 0, color: "#00F" },
      { blockId: "cb-1", word: "casa", occurrence: 1, color: "#F00" },
    ];
    const next = reconcileWordColors("So uma casa aqui.", prev);
    expect(next).toHaveLength(1);
    expect(next[0].occurrence).toBe(0);
  });
});

describe("emptySidecar", () => {
  it("returns a well-formed empty sidecar", () => {
    const s = emptySidecar();
    expect(s.version).toBe(1);
    expect(s.questions).toEqual({});
  });
});

describe("reconcileSidecar", () => {
  const prevActivity = (): StructuredActivity => ({
    sections: [
      {
        questions: [
          {
            id: "q1",
            number: 1,
            type: "open_ended",
            statement: "O Brasil e o Paraguai.",
            content: [
              { id: "b1", type: "text", content: "O Brasil e o Paraguai." },
            ],
          },
          {
            id: "q2",
            number: 2,
            type: "open_ended",
            statement: "Outra pergunta.",
            content: [{ id: "b2", type: "text", content: "Outra pergunta." }],
          },
        ],
      },
    ],
  });

  const prevSidecar = (): LayoutSidecar => ({
    version: 1,
    questions: {
      q1: {
        spacingAfter: 40,
        showSeparator: true,
        wordColors: [
          { blockId: "b1", word: "Brasil", occurrence: 0, color: "#00F" },
          { blockId: "b1", word: "Paraguai", occurrence: 0, color: "#F00" },
        ],
      },
      q2: { spacingAfter: 20 },
    },
  });

  it("preserves entries when content hash is unchanged", () => {
    const next = structuredClone(prevActivity());
    const result = reconcileSidecar(prevSidecar(), prevActivity(), next);
    expect(result.questions.q1).toMatchObject({
      spacingAfter: 40,
      showSeparator: true,
    });
    expect(result.questions.q1.wordColors).toHaveLength(2);
  });

  it("drops entries for question ids that no longer exist", () => {
    const next = structuredClone(prevActivity());
    next.sections[0].questions.splice(1, 1); // remove q2
    const result = reconcileSidecar(prevSidecar(), prevActivity(), next);
    expect(result.questions.q1).toBeDefined();
    expect(result.questions.q2).toBeUndefined();
  });

  it("keeps layout props and reconciles wordColors when content text changed", () => {
    const next = structuredClone(prevActivity());
    // Change "Paraguai" to "Peru" in q1 content
    next.sections[0].questions[0].content![0] = {
      id: "b1",
      type: "text",
      content: "O Brasil e o Peru.",
    };
    next.sections[0].questions[0].statement = "O Brasil e o Peru.";

    const result = reconcileSidecar(prevSidecar(), prevActivity(), next);
    expect(result.questions.q1.spacingAfter).toBe(40);
    expect(result.questions.q1.showSeparator).toBe(true);
    const colors = result.questions.q1.wordColors ?? [];
    expect(colors).toHaveLength(1);
    expect(colors[0].word).toBe("Brasil");
  });

  it("drops wordColors for block ids that no longer exist", () => {
    const next = structuredClone(prevActivity());
    // Replace block entirely with new id
    next.sections[0].questions[0].content![0] = {
      id: "b1-new",
      type: "text",
      content: "O Brasil e o Paraguai.",
    };
    const result = reconcileSidecar(prevSidecar(), prevActivity(), next);
    expect(result.questions.q1.wordColors ?? []).toHaveLength(0);
  });

  it("returns an empty sidecar unchanged", () => {
    const result = reconcileSidecar(
      emptySidecar(),
      prevActivity(),
      prevActivity(),
    );
    expect(result.questions).toEqual({});
  });
});

import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSupabaseTestClient,
  deleteAdaptation,
  deleteTeacher,
  fetchAdaptation,
  hasSupabaseCredentials,
  insertAdaptation,
  seedTeacher,
  updateAdaptationResult,
} from "./helpers";

/**
 * Camada 3 da pirâmide de testes (ver editor-state-model.md e refactor doc).
 * Exercita o fluxo completo "gerar → editar → salvar → reabrir" contra o
 * Supabase real, pra pegar bugs de serialização que unit tests com mock
 * não capturam (o bug da canon foi exatamente esse tipo).
 */

const describeIfSupabase = hasSupabaseCredentials ? describe : describe.skip;

describeIfSupabase("Adaptation persistence round-trip", () => {
  let client: SupabaseClient;
  let teacherId: string;
  const createdAdaptationIds = new Set<string>();

  beforeAll(async () => {
    client = createSupabaseTestClient();
    teacherId = await seedTeacher(client);
  });

  afterEach(async () => {
    for (const id of createdAdaptationIds) {
      await deleteAdaptation(client, id);
    }
    createdAdaptationIds.clear();
  });

  afterAll(async () => {
    if (teacherId) await deleteTeacher(client, teacherId);
  });

  const baseResult = () => ({
    version_universal: {
      sections: [
        {
          questions: [
            { number: 1, type: "open_ended", statement: "1+1 = ?" },
            { number: 2, type: "open_ended", statement: "2+2 = ?" },
          ],
        },
      ],
    },
    version_directed: {
      sections: [
        {
          questions: [
            { number: 1, type: "open_ended", statement: "1+1 = ? (dica: dois)" },
          ],
        },
      ],
    },
    editable_activity_universal: null,
    editable_activity_directed: null,
  });

  it("layout editado da dirigida sobrevive save → reload sem contaminar a universal", async () => {
    const initial = baseResult();
    const id = await insertAdaptation(client, {
      teacher_id: teacherId,
      original_activity: "texto original",
      activity_type: "prova",
      barriers_used: [],
      adaptation_result: initial,
    });
    createdAdaptationIds.add(id);

    const editedDirectedLayout = {
      sections: [
        {
          id: "s-1",
          title: "Seção adaptada",
          questions: [
            {
              id: "q-1",
              number: 1,
              statement: "1+1 = ? (dica: dois)",
              spacingAfter: 40,
              styleOverrides: { fontSize: 14, bold: true },
            },
          ],
        },
      ],
    };

    const edited = {
      ...initial,
      editable_activity_directed: editedDirectedLayout,
    };
    await updateAdaptationResult(client, id, teacherId, edited);

    const reloaded = await fetchAdaptation(client, id);
    const result = reloaded.adaptation_result as typeof edited;

    expect(result.editable_activity_directed).toEqual(editedDirectedLayout);
    expect(result.editable_activity_universal).toBeNull();
    // Conteúdo original preservado.
    expect(result.version_universal).toEqual(initial.version_universal);
    expect(result.version_directed).toEqual(initial.version_directed);
  });

  it("editar apenas a universal não altera a dirigida", async () => {
    const initial = baseResult();
    const id = await insertAdaptation(client, {
      teacher_id: teacherId,
      original_activity: "texto",
      adaptation_result: initial,
    });
    createdAdaptationIds.add(id);

    const universalLayout = {
      sections: [
        {
          id: "s-u",
          title: "Universal",
          questions: [{ id: "q-u-1", number: 1, statement: "1+1 = ?" }],
        },
      ],
    };

    await updateAdaptationResult(client, id, teacherId, {
      ...initial,
      editable_activity_universal: universalLayout,
    });

    const reloaded = await fetchAdaptation(client, id);
    const result = reloaded.adaptation_result as Record<string, unknown>;

    expect(result.editable_activity_universal).toEqual(universalLayout);
    expect(result.editable_activity_directed).toBeNull();
  });

  it("re-salvar substitui o layout por completo (sem merge implícito)", async () => {
    const initial = baseResult();
    const id = await insertAdaptation(client, {
      teacher_id: teacherId,
      original_activity: "texto",
      adaptation_result: initial,
    });
    createdAdaptationIds.add(id);

    const first = {
      sections: [{ id: "s1", questions: [{ id: "q1", number: 1, statement: "a" }] }],
    };
    await updateAdaptationResult(client, id, teacherId, {
      ...initial,
      editable_activity_directed: first,
    });

    const second = {
      sections: [{ id: "s2", questions: [{ id: "q2", number: 1, statement: "b" }] }],
    };
    await updateAdaptationResult(client, id, teacherId, {
      ...initial,
      editable_activity_directed: second,
    });

    const reloaded = await fetchAdaptation(client, id);
    const result = reloaded.adaptation_result as Record<string, unknown>;
    // Segundo save não mescla com o primeiro — substituição total.
    expect(result.editable_activity_directed).toEqual(second);
  });

  it("conteúdo JSON complexo (unicode, números, nulls) não corrompe no round-trip", async () => {
    const pathological = {
      ...baseResult(),
      editable_activity_universal: {
        sections: [
          {
            id: "✨",
            title: "Tìtulo com acentos e émojis 🎉",
            questions: [
              {
                id: "q-∞",
                number: 1,
                statement: "x² + y² = r² — verdade?",
                alternatives: [
                  { key: "a", text: "sim" },
                  { key: "b", text: "não" },
                ],
                spacingAfter: 0,
                styleOverrides: null,
              },
            ],
          },
        ],
      },
    };

    const id = await insertAdaptation(client, {
      teacher_id: teacherId,
      original_activity: "t",
      adaptation_result: pathological,
    });
    createdAdaptationIds.add(id);

    const reloaded = await fetchAdaptation(client, id);
    expect(reloaded.adaptation_result).toEqual(pathological);
  });
});

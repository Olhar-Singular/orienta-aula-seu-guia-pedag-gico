import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

export const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://localhost:54321";
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const hasSupabaseCredentials = SERVICE_ROLE_KEY.length > 0;

export function createSupabaseTestClient(): SupabaseClient {
  if (!hasSupabaseCredentials) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não definido — configure o ambiente antes (ver src/test/round-trip/README.md)",
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Cria um auth.users row via Admin API e retorna seu id. Usado para satisfazer
 * a FK `teacher_id` em adaptations_history. Chamador é responsável por deletar
 * no teardown.
 */
export async function seedTeacher(
  client: SupabaseClient,
  overrides: { email?: string } = {},
): Promise<string> {
  const email = overrides.email ?? `round-trip-${randomUUID()}@example.test`;
  const { data, error } = await client.auth.admin.createUser({
    email,
    password: "round-trip-password-123!",
    email_confirm: true,
  });
  if (error) throw new Error(`seedTeacher falhou: ${error.message}`);
  if (!data.user) throw new Error("seedTeacher retornou user vazio");
  return data.user.id;
}

export async function deleteTeacher(
  client: SupabaseClient,
  userId: string,
): Promise<void> {
  await client.auth.admin.deleteUser(userId);
}

export type AdaptationInsert = {
  teacher_id: string;
  original_activity: string;
  activity_type?: string;
  barriers_used?: unknown[];
  adaptation_result: Record<string, unknown>;
};

export async function insertAdaptation(
  client: SupabaseClient,
  payload: AdaptationInsert,
): Promise<string> {
  const { data, error } = await client
    .from("adaptations_history")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(`insertAdaptation falhou: ${error.message}`);
  return (data as { id: string }).id;
}

export async function fetchAdaptation(
  client: SupabaseClient,
  id: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await client
    .from("adaptations_history")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(`fetchAdaptation falhou: ${error.message}`);
  return data as Record<string, unknown>;
}

export async function updateAdaptationResult(
  client: SupabaseClient,
  id: string,
  teacherId: string,
  result: Record<string, unknown>,
): Promise<void> {
  const { error } = await client
    .from("adaptations_history")
    .update({ adaptation_result: result })
    .eq("id", id)
    .eq("teacher_id", teacherId);
  if (error) throw new Error(`updateAdaptationResult falhou: ${error.message}`);
}

export async function deleteAdaptation(
  client: SupabaseClient,
  id: string,
): Promise<void> {
  await client.from("adaptations_history").delete().eq("id", id);
}

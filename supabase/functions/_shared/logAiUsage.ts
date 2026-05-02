// Deno entry point: builds a Supabase admin client and delegates to the
// (testable) core in logAiUsageCore.ts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type AdminClient,
  type AiUsageLog,
  logAiUsageWithClient,
  runWithWaitUntil,
} from "./logAiUsageCore.ts";

export type { AiUsageLog };

function buildAdminClient(): AdminClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  ) as unknown as AdminClient;
}

export async function logAiUsage(log: AiUsageLog): Promise<void> {
  await logAiUsageWithClient(buildAdminClient(), log);
}

// Use this from edge functions in the success path: it ensures the insert
// survives the function returning, either via EdgeRuntime.waitUntil (preferred)
// or by awaiting inline as a fallback. Caller should `await` this.
export function runLogAiUsage(log: AiUsageLog): Promise<void> {
  return runWithWaitUntil(logAiUsage(log));
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  estimateTokens,
  getModelPricing,
  logAiUsageWithClient,
  runWithWaitUntil,
  type AdminClient,
  type AiUsageLog,
} from "../../supabase/functions/_shared/logAiUsageCore";

type Recorded = {
  insert: Record<string, unknown> | null;
  rpcCalled: boolean;
  pricingQueried: boolean;
};

interface MockOptions {
  insertError?: { message: string } | null;
  pricingRow?: { price_input_per_million: number; price_output_per_million: number } | null;
  schoolFromRpc?: string | null;
  rpcError?: { message: string } | null;
  pricingThrows?: boolean;
}

function makeAdminMock(opts: MockOptions = {}): { admin: AdminClient; rec: Recorded } {
  const rec: Recorded = { insert: null, rpcCalled: false, pricingQueried: false };

  const admin: AdminClient = {
    rpc: async (_fn, _args) => {
      rec.rpcCalled = true;
      return { data: opts.schoolFromRpc ?? null, error: opts.rpcError ?? null };
    },
    from: (table: string) => {
      if (table === "ai_model_pricing") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => {
                  rec.pricingQueried = true;
                  if (opts.pricingThrows) throw new Error("boom");
                  return { data: opts.pricingRow ?? null, error: null };
                },
              }),
            }),
          }),
          insert: async () => ({ error: null }),
        };
      }
      // ai_usage_logs (or anything else) — we only care about insert
      return {
        select: () => ({
          eq: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        }),
        insert: async (record: Record<string, unknown>) => {
          rec.insert = record;
          return { error: opts.insertError ?? null };
        },
      };
    },
  };
  return { admin, rec };
}

const baseLog: AiUsageLog = {
  user_id: "user-1",
  school_id: "school-1",
  action_type: "adaptation",
  model: "google/gemini-2.5-flash",
  input_tokens: 1000,
  output_tokens: 500,
  request_duration_ms: 250,
};

describe("estimateTokens", () => {
  it("returns ceil(length / 3.5)", () => {
    expect(estimateTokens("a".repeat(7))).toBe(2);
    expect(estimateTokens("a".repeat(8))).toBe(3);
    expect(estimateTokens("")).toBe(0);
  });
});

describe("getModelPricing", () => {
  it("returns pricing from DB row when present", async () => {
    const { admin } = makeAdminMock({
      pricingRow: { price_input_per_million: 1.5, price_output_per_million: 6 },
    });
    const p = await getModelPricing(admin, "google/gemini-2.5-pro");
    expect(p).toEqual({ input: 1.5, output: 6 });
  });

  it("falls back to hardcoded table when DB row is missing", async () => {
    const { admin } = makeAdminMock({ pricingRow: null });
    const p = await getModelPricing(admin, "google/gemini-2.5-flash");
    expect(p).toEqual({ input: 0.075, output: 0.30 });
  });

  it("falls back when DB query throws", async () => {
    const { admin } = makeAdminMock({ pricingThrows: true });
    const p = await getModelPricing(admin, "google/gemini-2.5-pro");
    expect(p).toEqual({ input: 1.25, output: 5.00 });
  });

  it("returns zeros for unknown model", async () => {
    const { admin } = makeAdminMock({ pricingRow: null });
    const p = await getModelPricing(admin, "unknown/model");
    expect(p).toEqual({ input: 0, output: 0 });
  });
});

describe("logAiUsageWithClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("inserts the log with computed costs and tokens_source=api", async () => {
    const { admin, rec } = makeAdminMock({
      pricingRow: { price_input_per_million: 0.075, price_output_per_million: 0.3 },
    });
    await logAiUsageWithClient(admin, baseLog);
    expect(rec.insert).toMatchObject({
      user_id: "user-1",
      school_id: "school-1",
      action_type: "adaptation",
      input_tokens: 1000,
      output_tokens: 500,
      total_tokens: 1500,
      tokens_source: "api",
    });
    // costs: (1000/1e6)*0.075 + (500/1e6)*0.3 = 0.000075 + 0.00015 = 0.000225
    expect(rec.insert?.cost_total).toBeCloseTo(0.000225, 9);
  });

  it("estimates tokens from prompt_text/response_text when API didn't report usage", async () => {
    const { admin, rec } = makeAdminMock({});
    await logAiUsageWithClient(admin, {
      ...baseLog,
      input_tokens: 0,
      output_tokens: 0,
      prompt_text: "a".repeat(35),  // 10 tokens
      response_text: "b".repeat(70), // 20 tokens
    });
    expect(rec.insert?.tokens_source).toBe("estimated");
    expect(rec.insert?.input_tokens).toBe(10);
    expect(rec.insert?.output_tokens).toBe(20);
  });

  it("marks tokens_source=unknown when neither API nor texts are available", async () => {
    const { admin, rec } = makeAdminMock({});
    await logAiUsageWithClient(admin, {
      ...baseLog,
      input_tokens: 0,
      output_tokens: 0,
    });
    expect(rec.insert?.tokens_source).toBe("unknown");
    expect(rec.insert?.total_tokens).toBe(0);
  });

  it("auto-resolves school_id via RPC when not provided", async () => {
    const { admin, rec } = makeAdminMock({ schoolFromRpc: "school-from-rpc" });
    await logAiUsageWithClient(admin, { ...baseLog, school_id: undefined });
    expect(rec.rpcCalled).toBe(true);
    expect(rec.insert?.school_id).toBe("school-from-rpc");
  });

  it("logs console.error when insert returns an error (no longer silent)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { admin } = makeAdminMock({
      insertError: { message: "row violates rls policy" },
    });
    await logAiUsageWithClient(admin, baseLog);
    expect(errSpy).toHaveBeenCalled();
    const msg = errSpy.mock.calls[0].join(" ");
    expect(msg).toContain("ai_usage_logs insert failed");
    expect(msg).toContain("row violates rls policy");
  });
});

describe("runWithWaitUntil", () => {
  it("delegates to EdgeRuntime.waitUntil when available and resolves immediately", async () => {
    let waitUntilArg: Promise<unknown> | null = null;
    const fakeGlobal = {
      EdgeRuntime: { waitUntil: (p: Promise<unknown>) => { waitUntilArg = p; } },
    };
    let resolveInner: () => void = () => {};
    const inner = new Promise<void>((res) => { resolveInner = res; });

    const t0 = Date.now();
    await runWithWaitUntil(inner, fakeGlobal);
    const elapsed = Date.now() - t0;

    expect(waitUntilArg).not.toBeNull();
    expect(elapsed).toBeLessThan(50);
    resolveInner();
    await waitUntilArg;
  });

  it("awaits inline when EdgeRuntime is not available", async () => {
    let resolved = false;
    const inner = new Promise<void>((res) => {
      setTimeout(() => { resolved = true; res(); }, 30);
    });
    await runWithWaitUntil(inner, {});
    expect(resolved).toBe(true);
  });

  it("swallows rejections via console.error so callers don't crash", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await runWithWaitUntil(Promise.reject(new Error("kaboom")), {});
    expect(errSpy).toHaveBeenCalled();
    const msg = errSpy.mock.calls[0].join(" ");
    expect(msg).toContain("kaboom");
  });
});

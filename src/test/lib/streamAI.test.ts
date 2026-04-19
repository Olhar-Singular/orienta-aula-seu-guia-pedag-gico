import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: { access_token: "token-123" } } })
      ),
    },
  },
}));

import { streamAI } from "@/lib/streamAI";
import { supabase } from "@/integrations/supabase/client";

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

describe("streamAI — inline SSE parsing logic (legacy tests kept for confidence)", () => {
  it("validates SSE line parsing logic", () => {
    const lines = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      'data: {"choices":[{"delta":{"content":" World"}}]}',
      "data: [DONE]",
      ": comment",
      "",
      "invalid line",
    ];
    const results: string[] = [];
    let done = false;
    for (const line of lines) {
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) results.push(content);
      } catch { /* skip */ }
    }
    expect(results).toEqual(["Hello", " World"]);
    expect(done).toBe(true);
  });

  it("handles malformed JSON gracefully", () => {
    const line = "data: {invalid json}";
    let parsed = false;
    try {
      JSON.parse(line.slice(6).trim());
      parsed = true;
    } catch { /* expected */ }
    expect(parsed).toBe(false);
  });

  it("handles [DONE] signal", () => {
    expect("data: [DONE]".slice(6).trim()).toBe("[DONE]");
  });

  it("skips comment lines", () => {
    expect(": comment".startsWith(":")).toBe(true);
  });

  it("handles carriage return stripping", () => {
    let line = "data: test\r";
    if (line.endsWith("\r")) line = line.slice(0, -1);
    expect(line).toBe("data: test");
  });
});

describe("streamAI — end-to-end", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as any;
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { access_token: "token-123" } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits content deltas in order and calls onDone", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Olá "}}]}\n',
        'data: {"choices":[{"delta":{"content":"Mundo"}}]}\n',
        "data: [DONE]\n",
      ])
    );
    const deltas: string[] = [];
    const onDone = vi.fn();
    const onError = vi.fn();

    await streamAI({
      endpoint: "adapt-activity",
      body: {},
      onDelta: (t) => deltas.push(t),
      onDone,
      onError,
    });

    expect(deltas).toEqual(["Olá ", "Mundo"]);
    expect(onDone).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it("skips comment and empty lines, tolerates carriage returns", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        ": keep-alive\r\n\r\n",
        'data: {"choices":[{"delta":{"content":"x"}}]}\r\n',
        "data: [DONE]\n",
      ])
    );
    const deltas: string[] = [];
    await streamAI({
      endpoint: "x",
      body: {},
      onDelta: (t) => deltas.push(t),
      onDone: vi.fn(),
      onError: vi.fn(),
    });
    expect(deltas).toEqual(["x"]);
  });

  it("flushes buffered lines at the end of stream (no trailing newline)", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"A"}}]}\n',
        // last chunk intentionally has no trailing newline
        'data: {"choices":[{"delta":{"content":"B"}}]}',
      ])
    );
    const deltas: string[] = [];
    await streamAI({
      endpoint: "x",
      body: {},
      onDelta: (t) => deltas.push(t),
      onDone: vi.fn(),
      onError: vi.fn(),
    });
    expect(deltas).toEqual(["A", "B"]);
  });

  it("calls onError with server error message when response is not ok", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "rate_limit" }), { status: 429 })
    );
    const onError = vi.fn();
    const onDone = vi.fn();
    await streamAI({
      endpoint: "x",
      body: {},
      onDelta: vi.fn(),
      onDone,
      onError,
    });
    expect(onError).toHaveBeenCalledWith("rate_limit");
    expect(onDone).not.toHaveBeenCalled();
  });

  it("falls back to status-code error message when error JSON is malformed", async () => {
    // Response with non-JSON body — .json() throws, triggering the catch.
    fetchMock.mockResolvedValueOnce(
      new Response("plain text", { status: 500 })
    );
    const onError = vi.fn();
    await streamAI({
      endpoint: "x",
      body: {},
      onDelta: vi.fn(),
      onDone: vi.fn(),
      onError,
    });
    expect(onError).toHaveBeenCalledWith("Erro de conexão");
  });

  it("reports 'Sem resposta do servidor' when body is null", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, { status: 200 })
    );
    const onError = vi.fn();
    await streamAI({
      endpoint: "x",
      body: {},
      onDelta: vi.fn(),
      onDone: vi.fn(),
      onError,
    });
    expect(onError).toHaveBeenCalledWith("Sem resposta do servidor");
  });

  it("catches fetch rejection and forwards the message to onError", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    const onError = vi.fn();
    const onDone = vi.fn();
    await streamAI({
      endpoint: "x",
      body: {},
      onDelta: vi.fn(),
      onDone,
      onError,
    });
    expect(onError).toHaveBeenCalledWith("boom");
    expect(onDone).not.toHaveBeenCalled();
  });

  it("coerces non-Error throws to 'Erro desconhecido'", async () => {
    fetchMock.mockImplementationOnce(() => { throw "string-thrown"; });
    const onError = vi.fn();
    await streamAI({
      endpoint: "x",
      body: {},
      onDelta: vi.fn(),
      onDone: vi.fn(),
      onError,
    });
    expect(onError).toHaveBeenCalledWith("Erro desconhecido");
  });

  it("sends bearer token from the current session", async () => {
    fetchMock.mockResolvedValueOnce(sseResponse(["data: [DONE]\n"]));
    await streamAI({
      endpoint: "my-endpoint",
      body: { hello: "world" },
      onDelta: vi.fn(),
      onDone: vi.fn(),
      onError: vi.fn(),
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toMatch(/^Bearer /);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ hello: "world" }));
  });

  it("ignores SSE lines that are not 'data: ' prefixed", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        "event: something\n",
        "random noise\n",
        'data: {"choices":[{"delta":{"content":"ok"}}]}\n',
        "data: [DONE]\n",
      ])
    );
    const deltas: string[] = [];
    await streamAI({
      endpoint: "x",
      body: {},
      onDelta: (t) => deltas.push(t),
      onDone: vi.fn(),
      onError: vi.fn(),
    });
    expect(deltas).toEqual(["ok"]);
  });
});

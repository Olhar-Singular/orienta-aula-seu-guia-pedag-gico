import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing streamAI
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
    },
  },
}));

// Set env vars
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");

import { streamAI } from "@/lib/streamAI";

describe("streamAI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls onError when response is not ok", async () => {
    const onDelta = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "Bad request" }),
    });

    await streamAI({
      endpoint: "test",
      body: {},
      onDelta,
      onDone,
      onError,
    });

    expect(onError).toHaveBeenCalledWith("Bad request");
    expect(onDone).not.toHaveBeenCalled();
  });

  it("calls onError when response has no body", async () => {
    const onDelta = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: null,
    });

    await streamAI({
      endpoint: "test",
      body: {},
      onDelta,
      onDone,
      onError,
    });

    expect(onError).toHaveBeenCalledWith("Sem resposta do servidor");
  });

  it("calls onError on network error", async () => {
    const onDelta = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await streamAI({
      endpoint: "test",
      body: {},
      onDelta,
      onDone,
      onError,
    });

    expect(onError).toHaveBeenCalledWith("Network error");
  });

  it("parses SSE stream and calls onDelta", async () => {
    const onDelta = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n'),
      encoder.encode('data: {"choices":[{"delta":{"content":" World"}}]}\n'),
      encoder.encode("data: [DONE]\n"),
    ];

    let chunkIndex = 0;
    const mockReader = {
      read: vi.fn().mockImplementation(() => {
        if (chunkIndex < chunks.length) {
          return Promise.resolve({ done: false, value: chunks[chunkIndex++] });
        }
        return Promise.resolve({ done: true, value: undefined });
      }),
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    await streamAI({
      endpoint: "chat",
      body: { messages: [] },
      onDelta,
      onDone,
      onError,
    });

    expect(onDelta).toHaveBeenCalledWith("Hello");
    expect(onDelta).toHaveBeenCalledWith(" World");
    expect(onDone).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("sends correct headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        }),
      },
    });
    globalThis.fetch = fetchMock;

    await streamAI({
      endpoint: "test-endpoint",
      body: { key: "value" },
      onDelta: vi.fn(),
      onDone: vi.fn(),
      onError: vi.fn(),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("test-endpoint"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        }),
      })
    );
  });
});

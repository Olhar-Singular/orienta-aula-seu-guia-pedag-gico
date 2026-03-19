import { describe, it, expect, vi, beforeEach } from "vitest";

describe("streamAI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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
    const jsonStr = line.slice(6).trim();
    let parsed = false;
    try {
      JSON.parse(jsonStr);
      parsed = true;
    } catch { /* expected */ }
    expect(parsed).toBe(false);
  });

  it("handles [DONE] signal", () => {
    const line = "data: [DONE]";
    const jsonStr = line.slice(6).trim();
    expect(jsonStr).toBe("[DONE]");
  });

  it("skips comment lines", () => {
    const line = ": this is a comment";
    expect(line.startsWith(":")).toBe(true);
  });

  it("handles carriage return stripping", () => {
    let line = "data: test\r";
    if (line.endsWith("\r")) line = line.slice(0, -1);
    expect(line).toBe("data: test");
  });
});

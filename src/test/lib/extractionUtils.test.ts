import { describe, it, expect, vi, afterEach } from "vitest";
import {
  normalizeTextForDedup,
  findDuplicates,
  dataUrlToBlob,
  fetchWithRetry,
} from "@/lib/extraction-utils";

describe("normalizeTextForDedup", () => {
  it("normalizes text to lowercase", () => {
    expect(normalizeTextForDedup("Hello World")).toBe("hello world");
  });

  it("collapses whitespace", () => {
    expect(normalizeTextForDedup("hello   world")).toBe("hello world");
  });

  it("trims whitespace", () => {
    expect(normalizeTextForDedup("  hello  ")).toBe("hello");
  });

  it("handles NFKC normalization", () => {
    expect(normalizeTextForDedup("ﬁ")).toBe("fi");
  });

  it("handles empty string", () => {
    expect(normalizeTextForDedup("")).toBe("");
  });
});

describe("findDuplicates", () => {
  it("finds duplicate questions by normalized text", () => {
    const existing = [{ text: "What is 2+2?" }];
    const newQ = [{ text: "what is 2+2?" }, { text: "New question?" }];
    const dups = findDuplicates(newQ, existing);
    expect(dups.has(0)).toBe(true);
    expect(dups.has(1)).toBe(false);
  });

  it("returns empty set with no duplicates", () => {
    const existing = [{ text: "Question A" }];
    const newQ = [{ text: "Question B" }];
    expect(findDuplicates(newQ, existing).size).toBe(0);
  });

  it("handles empty arrays", () => {
    expect(findDuplicates([], []).size).toBe(0);
    expect(findDuplicates([{ text: "Q" }], []).size).toBe(0);
  });
});

describe("dataUrlToBlob", () => {
  it("converts a data URL to a Blob", () => {
    // Create a minimal PNG data URL
    const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
    const blob = dataUrlToBlob(dataUrl);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
  });

  it("handles data URLs with different mime types", () => {
    const dataUrl = "data:image/jpeg;base64,aGVsbG8=";
    const blob = dataUrlToBlob(dataUrl);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/jpeg");
  });
});

describe("fetchWithRetry", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns response immediately on first successful attempt", async () => {
    const mockResp = { ok: true, status: 200 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResp));

    const result = await fetchWithRetry("https://example.com");

    expect(result.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("passes url and options to fetch", async () => {
    const mockResp = { ok: true, status: 200 };
    const fetchSpy = vi.fn().mockResolvedValue(mockResp);
    vi.stubGlobal("fetch", fetchSpy);

    await fetchWithRetry("https://example.com/api", { method: "POST" });

    expect(fetchSpy).toHaveBeenCalledWith("https://example.com/api", { method: "POST" });
  });

  it("retries on non-ok response and succeeds on second attempt", async () => {
    vi.useFakeTimers();
    const mockFetchFn = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetchFn);

    const promise = fetchWithRetry("https://example.com", {}, 3);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetchFn).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });

  it("throws with HTTP status message after all retries exhausted on non-ok", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const promise = fetchWithRetry("https://example.com", {}, 3);
    // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection
    const assertion = expect(promise).rejects.toThrow("HTTP 503");
    await vi.runAllTimersAsync();
    await assertion;

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("retries on network error (thrown exception) and succeeds on second attempt", async () => {
    vi.useFakeTimers();
    const mockFetchFn = vi.fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetchFn);

    const promise = fetchWithRetry("https://example.com", {}, 3);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetchFn).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });

  it("re-throws original error after max retries on persistent network failure", async () => {
    vi.useFakeTimers();
    const networkError = new Error("Connection refused");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(networkError));

    const promise = fetchWithRetry("https://example.com", {}, 3);
    // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection
    const assertion = expect(promise).rejects.toThrow("Connection refused");
    await vi.runAllTimersAsync();
    await assertion;

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("uses default of 3 retries when maxRetries not specified", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const promise = fetchWithRetry("https://example.com");
    // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection
    const assertion = expect(promise).rejects.toThrow("HTTP 500");
    await vi.runAllTimersAsync();
    await assertion;

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});

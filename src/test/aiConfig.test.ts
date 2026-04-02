import { describe, it, expect } from "vitest";
import {
  getAiConfig,
  resolveImagePayloadFields,
} from "../../supabase/functions/_shared/aiConfig";

// Helper: create env getter from a plain object
function makeEnv(vars: Record<string, string | undefined>) {
  return (key: string) => vars[key];
}

describe("getAiConfig", () => {
  it("returns Lovable config when LOVABLE_API_KEY is present", () => {
    const env = makeEnv({ LOVABLE_API_KEY: "lovable-key-123" });
    const config = getAiConfig(env);

    expect(config.apiKey).toBe("lovable-key-123");
    expect(config.baseUrl).toBe("https://ai.gateway.lovable.dev/v1");
    expect(config.isLovable).toBe(true);
  });

  it("returns Google config when only AI_API_KEY is present", () => {
    const env = makeEnv({ AI_API_KEY: "google-key-abc" });
    const config = getAiConfig(env);

    expect(config.apiKey).toBe("google-key-abc");
    expect(config.baseUrl).toBe(
      "https://generativelanguage.googleapis.com/v1beta/openai"
    );
    expect(config.isLovable).toBe(false);
  });

  it("prefers LOVABLE_API_KEY when both keys are present", () => {
    const env = makeEnv({
      LOVABLE_API_KEY: "lovable-key-123",
      AI_API_KEY: "google-key-abc",
    });
    const config = getAiConfig(env);

    expect(config.apiKey).toBe("lovable-key-123");
    expect(config.isLovable).toBe(true);
  });

  it("throws a descriptive error when no key is present", () => {
    const env = makeEnv({});

    expect(() => getAiConfig(env)).toThrow(
      /LOVABLE_API_KEY.*AI_API_KEY/i
    );
  });
});

describe("resolveModel (Lovable mode)", () => {
  it("does not alter model names in Lovable mode", () => {
    const env = makeEnv({ LOVABLE_API_KEY: "key" });
    const { resolveModel } = getAiConfig(env);

    expect(resolveModel("google/gemini-2.5-pro")).toBe("google/gemini-2.5-pro");
    expect(resolveModel("google/gemini-2.5-flash")).toBe(
      "google/gemini-2.5-flash"
    );
    expect(resolveModel("google/gemini-3-flash-preview")).toBe(
      "google/gemini-3-flash-preview"
    );
    expect(resolveModel("google/gemini-3.1-flash-image-preview")).toBe(
      "google/gemini-3.1-flash-image-preview"
    );
  });
});

describe("resolveModel (Google fallback mode)", () => {
  it("maps all known model names correctly", () => {
    const env = makeEnv({ AI_API_KEY: "google-key" });
    const { resolveModel } = getAiConfig(env);

    expect(resolveModel("google/gemini-2.5-pro")).toBe("gemini-2.5-pro");
    expect(resolveModel("google/gemini-2.5-flash")).toBe("gemini-2.5-flash");
    expect(resolveModel("google/gemini-3-flash-preview")).toBe(
      "gemini-2.0-flash"
    );
    expect(resolveModel("google/gemini-3.1-flash-image-preview")).toBe(
      "gemini-2.0-flash-preview-image-generation"
    );
  });
});

describe("resolveImagePayloadFields", () => {
  it("returns modalities field when isLovable is true", () => {
    const fields = resolveImagePayloadFields(true);
    expect(fields).toEqual({ modalities: ["image", "text"] });
  });

  it("returns response_modalities field when isLovable is false", () => {
    const fields = resolveImagePayloadFields(false);
    expect(fields).toEqual({ response_modalities: ["IMAGE", "TEXT"] });
  });
});

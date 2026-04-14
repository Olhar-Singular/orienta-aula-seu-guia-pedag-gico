import { describe, it, expect } from "vitest";
import {
  registerAndGenerateDsl,
  nextImageName,
  resolveImageSrc,
  scanAndRegisterUrls,
  expandImageRegistry,
} from "@/components/editor/imageManagerUtils";
import type { ImageItem } from "@/components/editor/imageManagerUtils";

describe("nextImageName", () => {
  it("returns imagem-1 for empty registry", () => {
    expect(nextImageName({})).toBe("imagem-1");
  });

  it("returns imagem-2 when imagem-1 exists", () => {
    expect(nextImageName({ "imagem-1": "data:..." })).toBe("imagem-2");
  });

  it("fills gaps", () => {
    expect(nextImageName({ "imagem-1": "a", "imagem-3": "b" })).toBe("imagem-2");
  });
});

describe("registerAndGenerateDsl", () => {
  it("registers all images with short names", () => {
    const images: ImageItem[] = [
      { id: "a", src: "https://example.com/img.png", align: "left" },
    ];
    const { dsl, updatedRegistry } = registerAndGenerateDsl(images, {});
    expect(dsl).toBe("[img:imagem-1]");
    expect(updatedRegistry["imagem-1"]).toBe("https://example.com/img.png");
  });

  it("includes align param", () => {
    const images: ImageItem[] = [
      { id: "a", src: "data:image/png;base64,abc", align: "center" },
    ];
    const { dsl, updatedRegistry } = registerAndGenerateDsl(images, {});
    expect(dsl).toBe("[img:imagem-1 align=center]");
    expect(updatedRegistry["imagem-1"]).toBe("data:image/png;base64,abc");
  });

  it("increments name for multiple images", () => {
    const images: ImageItem[] = [
      { id: "a", src: "srcA", align: "left" },
      { id: "b", src: "srcB", align: "center" },
    ];
    const { dsl, updatedRegistry } = registerAndGenerateDsl(images, {});
    expect(dsl).toBe("[img:imagem-1]\n[img:imagem-2 align=center]");
    expect(updatedRegistry["imagem-1"]).toBe("srcA");
    expect(updatedRegistry["imagem-2"]).toBe("srcB");
  });

  it("continues numbering from existing registry", () => {
    const images: ImageItem[] = [
      { id: "c", src: "srcC", align: "right" },
    ];
    const { dsl, updatedRegistry } = registerAndGenerateDsl(images, {
      "imagem-1": "existing",
    });
    expect(dsl).toBe("[img:imagem-2 align=right]");
    expect(updatedRegistry["imagem-1"]).toBe("existing");
    expect(updatedRegistry["imagem-2"]).toBe("srcC");
  });
});

describe("resolveImageSrc", () => {
  it("resolves registered reference", () => {
    expect(resolveImageSrc("imagem-1", { "imagem-1": "data:abc" })).toBe("data:abc");
  });

  it("returns original string if not in registry", () => {
    expect(resolveImageSrc("https://example.com/img.png", {})).toBe(
      "https://example.com/img.png"
    );
  });

  it("returns original string for unknown reference", () => {
    expect(resolveImageSrc("imagem-99", {})).toBe("imagem-99");
  });
});

describe("scanAndRegisterUrls", () => {
  it("returns null when no URLs in text", () => {
    const result = scanAndRegisterUrls("1) Questao\n[img:imagem-1]", {});
    expect(result).toBeNull();
  });

  it("replaces http URL with short name", () => {
    const text = "1) Observe.\n[img:https://storage.example.com/img.png]";
    const result = scanAndRegisterUrls(text, {});
    expect(result).not.toBeNull();
    expect(result!.cleanText).toBe("1) Observe.\n[img:imagem-1]");
    expect(result!.updatedRegistry["imagem-1"]).toBe("https://storage.example.com/img.png");
  });

  it("replaces data: URL with short name", () => {
    const text = "[img:data:image/png;base64,abc123]";
    const result = scanAndRegisterUrls(text, {});
    expect(result).not.toBeNull();
    expect(result!.cleanText).toBe("[img:imagem-1]");
    expect(result!.updatedRegistry["imagem-1"]).toBe("data:image/png;base64,abc123");
  });

  it("preserves params like align and width", () => {
    const text = "[img:https://example.com/img.png width=300 align=center]";
    const result = scanAndRegisterUrls(text, {});
    expect(result).not.toBeNull();
    expect(result!.cleanText).toBe("[img:imagem-1 width=300 align=center]");
  });

  it("handles multiple URLs in same text", () => {
    const text = "1) Q1\n[img:https://a.com/1.png]\n2) Q2\n[img:https://b.com/2.png]";
    const result = scanAndRegisterUrls(text, {});
    expect(result).not.toBeNull();
    expect(result!.cleanText).toBe("1) Q1\n[img:imagem-1]\n2) Q2\n[img:imagem-2]");
    expect(result!.updatedRegistry["imagem-1"]).toBe("https://a.com/1.png");
    expect(result!.updatedRegistry["imagem-2"]).toBe("https://b.com/2.png");
  });

  it("reuses name for duplicate URL", () => {
    const text = "[img:https://a.com/1.png]\n[img:https://a.com/1.png]";
    const result = scanAndRegisterUrls(text, {});
    expect(result).not.toBeNull();
    expect(result!.cleanText).toBe("[img:imagem-1]\n[img:imagem-1]");
    expect(Object.keys(result!.updatedRegistry)).toHaveLength(1);
  });

  it("continues numbering from existing registry", () => {
    const text = "[img:https://new.com/img.png]";
    const result = scanAndRegisterUrls(text, { "imagem-1": "old" });
    expect(result).not.toBeNull();
    expect(result!.cleanText).toBe("[img:imagem-2]");
    expect(result!.updatedRegistry["imagem-1"]).toBe("old");
    expect(result!.updatedRegistry["imagem-2"]).toBe("https://new.com/img.png");
  });
});

describe("expandImageRegistry", () => {
  it("returns text unchanged when no placeholders exist", () => {
    const text = "1) Questao\n[img:https://a.com/img.png]";
    expect(expandImageRegistry(text, {})).toBe(text);
  });

  it("expands [img:imagem-N] to [img:URL] using registry", () => {
    const text = "1) Q\n[img:imagem-1]";
    const registry = { "imagem-1": "https://a.com/img.png" };
    expect(expandImageRegistry(text, registry)).toBe(
      "1) Q\n[img:https://a.com/img.png]",
    );
  });

  it("preserves params like align when expanding", () => {
    const text = "[img:imagem-1 align=center]";
    const registry = { "imagem-1": "https://a.com/img.png" };
    expect(expandImageRegistry(text, registry)).toBe(
      "[img:https://a.com/img.png align=center]",
    );
  });

  it("expands multiple placeholders", () => {
    const text = "[img:imagem-1]\n[img:imagem-2 align=right]";
    const registry = {
      "imagem-1": "https://a.com/1.png",
      "imagem-2": "data:image/png;base64,xyz",
    };
    expect(expandImageRegistry(text, registry)).toBe(
      "[img:https://a.com/1.png]\n[img:data:image/png;base64,xyz align=right]",
    );
  });

  it("leaves placeholder untouched when not in registry", () => {
    const text = "[img:imagem-99]";
    expect(expandImageRegistry(text, {})).toBe("[img:imagem-99]");
  });

  it("does not touch raw URLs in [img:...] tokens", () => {
    const text = "[img:https://already.com/img.png align=center]";
    const registry = { "imagem-1": "https://other.com/img.png" };
    expect(expandImageRegistry(text, registry)).toBe(text);
  });
});

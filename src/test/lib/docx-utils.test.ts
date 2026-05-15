import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock mammoth before importing the module under test.
const extractRawText = vi.fn();
const convertToHtml = vi.fn();
const imgElement = vi.fn((handler: unknown) => handler);

vi.mock("mammoth", () => ({
  default: {
    extractRawText: (...args: unknown[]) => extractRawText(...args),
    convertToHtml: (...args: unknown[]) => convertToHtml(...args),
    images: { imgElement: (h: unknown) => imgElement(h) },
  },
}));

import { extractDocxText, extractDocxWithImages, isDocxFile } from "@/lib/docx-utils";

function makeFile(bytes: number[], name = "doc.docx"): File {
  const buf = new Uint8Array(bytes).buffer;
  const file = new File([new Uint8Array(bytes)], name);
  // jsdom's File lacks arrayBuffer in some versions — patch it.
  if (typeof (file as any).arrayBuffer !== "function") {
    (file as any).arrayBuffer = () => Promise.resolve(buf);
  }
  return file;
}

describe("extractDocxText", () => {
  beforeEach(() => {
    extractRawText.mockReset();
  });

  it("returns text from mammoth.extractRawText", async () => {
    extractRawText.mockResolvedValue({ value: "conteúdo extraído" });
    const file = makeFile([1, 2, 3]);
    const result = await extractDocxText(file);
    expect(result).toBe("conteúdo extraído");
    expect(extractRawText).toHaveBeenCalledWith(
      expect.objectContaining({ arrayBuffer: expect.any(ArrayBuffer) })
    );
  });

  it("propagates mammoth errors", async () => {
    extractRawText.mockRejectedValue(new Error("broken"));
    await expect(extractDocxText(makeFile([0]))).rejects.toThrow("broken");
  });
});

describe("extractDocxWithImages", () => {
  beforeEach(() => {
    extractRawText.mockReset();
    convertToHtml.mockReset();
    imgElement.mockClear();
  });

  it("collects image data URLs produced by the imgElement handler", async () => {
    extractRawText.mockResolvedValue({ value: "texto" });

    // Simulate mammoth invoking the imgElement handler with a fake image object.
    convertToHtml.mockImplementation(async (_input, opts: any) => {
      const handler = opts.convertImage;
      await handler({
        contentType: "image/png",
        read: () => Promise.resolve("BASE64PNG"),
      });
      await handler({
        contentType: "image/jpeg",
        read: () => Promise.resolve("BASE64JPG"),
      });
      return { value: "<html/>" };
    });

    const { text, images } = await extractDocxWithImages(makeFile([0]));
    expect(text).toBe("texto");
    expect(images).toEqual([
      "data:image/png;base64,BASE64PNG",
      "data:image/jpeg;base64,BASE64JPG",
    ]);
  });

  it("skips WMF and EMF images and returns an empty src for them", async () => {
    extractRawText.mockResolvedValue({ value: "" });

    const results: { src: string }[] = [];
    convertToHtml.mockImplementation(async (_i, opts: any) => {
      results.push(
        await opts.convertImage({
          contentType: "image/x-wmf",
          read: () => Promise.resolve("WMFDATA"),
        })
      );
      results.push(
        await opts.convertImage({
          contentType: "image/emf",
          read: () => Promise.resolve("EMFDATA"),
        })
      );
      return { value: "" };
    });

    const { images } = await extractDocxWithImages(makeFile([0]));
    expect(images).toEqual([]);
    expect(results).toEqual([{ src: "" }, { src: "" }]);
  });

  it("defaults to image/png when contentType is missing", async () => {
    extractRawText.mockResolvedValue({ value: "" });
    convertToHtml.mockImplementation(async (_i, opts: any) => {
      await opts.convertImage({
        read: () => Promise.resolve("RAW"),
      });
      return { value: "" };
    });

    const { images } = await extractDocxWithImages(makeFile([0]));
    expect(images).toEqual(["data:image/png;base64,RAW"]);
  });
});

describe("isDocxFile", () => {
  it("returns true for PK\\x03\\x04 (zip header)", async () => {
    const file = makeFile([0x50, 0x4b, 0x03, 0x04, 0xff]);
    await expect(isDocxFile(file)).resolves.toBe(true);
  });

  it("returns false when the magic bytes do not match", async () => {
    const file = makeFile([0x25, 0x50, 0x44, 0x46]); // %PDF
    await expect(isDocxFile(file)).resolves.toBe(false);
  });

  it("returns false for files shorter than 4 bytes", async () => {
    const file = makeFile([0x50, 0x4b]);
    await expect(isDocxFile(file)).resolves.toBe(false);
  });

  it("returns false when FileReader fires onerror", async () => {
    const OrigFileReader = global.FileReader;

    class FaultyReader {
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      readAsArrayBuffer() {
        Promise.resolve().then(() => this.onerror?.());
      }
    }

    global.FileReader = FaultyReader as any;
    try {
      const file = makeFile([0x50, 0x4b, 0x03, 0x04]);
      await expect(isDocxFile(file)).resolves.toBe(false);
    } finally {
      global.FileReader = OrigFileReader;
    }
  });
});

import { describe, it, expect } from "vitest";
import {
  validatePdfMagicBytes,
  validateDocxMagicBytes,
  validateImageMagicBytes,
  detectFileType,
} from "@/lib/fileValidation";

describe("Magic bytes validation", () => {
  it("validates PDF magic bytes (%PDF)", () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(validatePdfMagicBytes(bytes)).toBe(true);
  });

  it("rejects non-PDF bytes", () => {
    expect(validatePdfMagicBytes(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBe(false);
  });

  it("validates DOCX magic bytes (PK)", () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    expect(validateDocxMagicBytes(bytes)).toBe(true);
  });

  it("rejects non-DOCX bytes", () => {
    expect(validateDocxMagicBytes(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBe(false);
  });

  it("validates JPEG magic bytes", () => {
    expect(validateImageMagicBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
  });

  it("validates PNG magic bytes", () => {
    expect(validateImageMagicBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe("png");
  });

  it("rejects unknown image bytes", () => {
    expect(validateImageMagicBytes(new Uint8Array([0x00, 0x00, 0x00, 0x00]))).toBe(null);
  });

  it("detects file types correctly", () => {
    expect(detectFileType(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe("pdf");
    expect(detectFileType(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe("docx");
    expect(detectFileType(new Uint8Array([0xff, 0xd8, 0xff]))).toBe("jpeg");
    expect(detectFileType(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe("png");
    expect(detectFileType(new Uint8Array([0x00, 0x00, 0x00, 0x00]))).toBe(null);
  });

  it("rejects too-short byte arrays", () => {
    expect(validatePdfMagicBytes(new Uint8Array([0x25]))).toBe(false);
    expect(validateDocxMagicBytes(new Uint8Array([]))).toBe(false);
  });
});

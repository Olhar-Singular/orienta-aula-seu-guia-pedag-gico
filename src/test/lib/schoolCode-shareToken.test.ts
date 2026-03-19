import { describe, it, expect, vi } from "vitest";
import { generateSchoolCode, isValidSchoolCode } from "@/lib/schoolCode";
import { generateShareToken, isValidShareToken } from "@/lib/shareToken";

describe("generateSchoolCode", () => {
  it("generates 6-character codes", () => {
    for (let i = 0; i < 100; i++) {
      expect(generateSchoolCode()).toHaveLength(6);
    }
  });

  it("generates only valid characters (no 0, O, 1, I)", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateSchoolCode();
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it("generates uppercase codes", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateSchoolCode();
      expect(code).toMatch(/^[A-Z2-9]+$/);
    }
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateSchoolCode()));
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe("isValidSchoolCode", () => {
  it("accepts valid codes", () => {
    expect(isValidSchoolCode("ABCDEF")).toBe(true);
    expect(isValidSchoolCode("X2Y3Z4")).toBe(true);
    expect(isValidSchoolCode("HJKLMN")).toBe(true);
  });

  it("rejects codes with ambiguous chars", () => {
    expect(isValidSchoolCode("A0BCDE")).toBe(false); // has 0
    expect(isValidSchoolCode("A1BCDE")).toBe(false); // has 1
    expect(isValidSchoolCode("AOBCDE")).toBe(false); // has O
    expect(isValidSchoolCode("AIBCDE")).toBe(false); // has I
  });

  it("rejects wrong length", () => {
    expect(isValidSchoolCode("ABC")).toBe(false);
    expect(isValidSchoolCode("ABCDEFGH")).toBe(false);
  });

  it("rejects lowercase", () => {
    expect(isValidSchoolCode("abcdef")).toBe(false);
  });

  it("rejects special characters", () => {
    expect(isValidSchoolCode("ABC-DE")).toBe(false);
    expect(isValidSchoolCode("ABC DE")).toBe(false);
  });
});

describe("generateShareToken", () => {
  it("generates 24-character tokens", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateShareToken()).toHaveLength(24);
    }
  });

  it("generates alphanumeric tokens", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateShareToken()).toMatch(/^[A-Za-z0-9]+$/);
    }
  });
});

describe("isValidShareToken", () => {
  it("accepts valid 24-char alphanumeric tokens", () => {
    expect(isValidShareToken("AbCdEfGhJkLmNpQrStUvWx23")).toBe(true);
  });

  it("rejects short tokens", () => {
    expect(isValidShareToken("short")).toBe(false);
  });

  it("rejects tokens with special chars", () => {
    expect(isValidShareToken("AAAA!BBB@CCC#DDD$EEE%FFF")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidShareToken("")).toBe(false);
  });
});

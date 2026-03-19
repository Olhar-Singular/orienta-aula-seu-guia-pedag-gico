import { describe, it, expect } from "vitest";
import { sanitize } from "../../supabase/functions/_shared/sanitize";

describe("sanitize", () => {
  it("removes HTML tags", () => {
    expect(sanitize("<script>alert('xss')</script>Hello")).toBe("alert(xss)Hello");
  });

  it("removes dangerous characters", () => {
    expect(sanitize('Test <>"\'& chars')).toBe("Test  chars");
  });

  it("truncates to maxLength", () => {
    const long = "a".repeat(100);
    expect(sanitize(long, 10)).toBe("a".repeat(10));
  });

  it("trims whitespace", () => {
    expect(sanitize("  hello world  ")).toBe("hello world");
  });

  it("handles SQL injection attempts", () => {
    const input = "'; DROP TABLE users; --";
    const result = sanitize(input);
    expect(result).not.toContain("'");
    expect(result).toBe("; DROP TABLE users; --");
  });

  it("handles empty string", () => {
    expect(sanitize("")).toBe("");
  });
});

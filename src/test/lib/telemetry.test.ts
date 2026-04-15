import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { captureException, initTelemetry, setTelemetryUser } from "@/lib/telemetry";

describe("telemetry scaffolding", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("initTelemetry is idempotent (no throw on second call)", () => {
    initTelemetry();
    expect(() => initTelemetry()).not.toThrow();
  });

  it("captureException forwards the error to console when no DSN is set", () => {
    const err = new Error("boom");
    captureException(err, { where: "test" });
    expect(errorSpy).toHaveBeenCalled();
    const args = errorSpy.mock.calls[0] as unknown[];
    expect(args).toEqual(expect.arrayContaining([err]));
  });

  it("setTelemetryUser accepts null (sign-out) without throwing", () => {
    expect(() => setTelemetryUser(null)).not.toThrow();
    expect(() => setTelemetryUser("user-123")).not.toThrow();
  });
});

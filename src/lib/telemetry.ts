/**
 * Telemetry scaffolding (Fase 6.4 do refactor). Intentionally dependency-free
 * — swap the no-op body for `@sentry/react` calls when the DSN is provisioned.
 * Until then the module forwards to `console` so signal lands somewhere
 * greppable in dev, and stays silent (no PII, no network) in production builds
 * without a DSN.
 *
 * Integration point:
 *   1. Install `@sentry/react` + `@sentry/vite-plugin`
 *   2. Replace `captureException` body with `Sentry.captureException(error, { extra: context })`
 *   3. Replace `setUser` body with `Sentry.setUser({ id })`
 *   4. Wire `Sentry.init({ dsn, environment })` into `initTelemetry()`
 *
 * Keep this API small — every caller outside this file talks through these
 * three functions, not the underlying SDK.
 */

type TelemetryContext = Record<string, unknown>;

let isInitialized = false;
let dsn: string | undefined;

export function initTelemetry(): void {
  if (isInitialized) return;
  dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  isInitialized = true;
  if (!dsn) {
    return;
  }
}

export function captureException(error: unknown, context?: TelemetryContext): void {
  if (!isInitialized) initTelemetry();
  if (dsn) {
    console.error("[telemetry]", error, context);
    return;
  }
  console.error(error, context);
}

export function setTelemetryUser(userId: string | null): void {
  if (!isInitialized) initTelemetry();
  if (!dsn) return;
  void userId;
}

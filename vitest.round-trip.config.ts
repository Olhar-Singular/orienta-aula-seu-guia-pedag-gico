import { defineConfig } from "vitest/config";
import path from "path";

// Round-trip tests talk to a real Supabase instance (local by default).
// Keep them in a separate config so `npm run test` stays hermetic.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/test/round-trip/**/*.{test,spec}.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "forks",
    poolOptions: { forks: { maxForks: 1, minForks: 1 } },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});

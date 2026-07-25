import { defineConfig } from "vitest/config";

// Standalone test config — deliberately does NOT load the app's vite.config.ts
// (TanStack Start / Nitro plugins). The suites here are pure Node unit tests
// (envelope builder + fixtures + forwarder), so they need no app plugins.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});

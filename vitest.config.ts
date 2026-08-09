import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Standalone test config — deliberately does NOT load the app's vite.config.ts
// (TanStack Start / Nitro plugins). The suites here are pure Node unit tests.
// The `@` alias mirrors tsconfig "paths" so server modules that import
// `@/components/...` (e.g. orders/checkout importing the shared order-schema)
// resolve the same way they do in the app build.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});

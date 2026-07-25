import { fileURLToPath } from "node:url";
import { defineConfig, type PluginOption } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

// Hand-written Vite config. It replaced a vendored config wrapper that bundled
// these plugins implicitly; they are now wired explicitly. The wrapper's
// editor-only pieces were intentionally dropped: the dev SSR / server-fn error
// loggers (they patched TanStack internals by string-match and emitted to an
// external HMR telemetry channel), the sandbox build diagnostics, the HMR gate,
// the dev-server bridge, the asset proxy, and the forced sandbox port/host.
// Client error reporting now lives in src/lib/report-error.ts. See CLAUDE.md.
export default defineConfig(async ({ command }) => {
  const plugins: PluginOption[] = [
    tailwindcss(),
    // The `@/` path alias is sourced from tsconfig.json "paths" via this plugin.
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Fail the build if server-only modules leak into the client bundle.
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      // Route SSR through src/server.ts (our error-normalizing entry wrapper).
      server: { entry: "server" },
    }),
  ];

  // Nitro produces the deployable server bundle and is only needed at build
  // time. Railway is the deploy target, so force the Node server preset. Phase 6
  // finalizes the deploy/runtime configuration.
  if (command === "build") {
    const { nitro } = await import("nitro/vite");
    plugins.push(nitro({ preset: "node-server" }));
  }

  plugins.push(viteReact());

  return {
    plugins,
    // Only VITE_-prefixed env vars are exposed to the client bundle.
    envPrefix: "VITE_",
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
      // Guard against duplicate React / Query copies pulled in transitively.
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
    },
    server: { port: 8080 },
  };
});

import { createFileRoute } from "@tanstack/react-router";

import { serverEnv } from "@/server/env";
import { supabaseAdmin } from "@/server/supabase";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        let db: "ok" | "error" | "unconfigured" = "unconfigured";
        try {
          const { error } = await supabaseAdmin()
            .from("quote_requests")
            .select("id", { head: true, count: "exact" })
            .limit(1);
          db = error ? "error" : "ok";
        } catch (err) {
          // Missing SUPABASE_URL / SERVICE_ROLE_KEY throws here.
          db = String(err).includes("Missing required server env") ? "unconfigured" : "error";
        }

        return new Response(JSON.stringify({ ok: db === "ok", sha: serverEnv.buildSha(), db }), {
          status: db === "ok" ? 200 : 503,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});

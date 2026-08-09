import { createFileRoute } from "@tanstack/react-router";

import { sendProofEmail } from "@/server/checkout";
import { authorizeAdmin } from "@/server/admin-auth";

/**
 * POST /api/admin/orders/:id/send-proof — email the customer their proof with the
 * signed approval link (paid orders only). Server-to-server (bearer ADMIN_API_TOKEN).
 * A1 sends this once the proof is prepared; the customer's approval flips paid->proofed.
 */
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/orders/$id/send-proof")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const auth = authorizeAdmin(request);
        if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

        const id = new URL(request.url).pathname.match(/\/orders\/([^/]+)\/send-proof$/)?.[1];
        if (!id) return json({ ok: false, error: "Order id required." }, 400);

        const result = await sendProofEmail(id);
        if (!result.ok) return json({ ok: false, error: result.error }, result.status);
        return json({ ok: true }, 200);
      },
    },
  },
});

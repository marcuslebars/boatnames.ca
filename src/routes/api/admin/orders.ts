import { createFileRoute } from "@tanstack/react-router";

import { createOrderInputSchema } from "@/components/site/order-schema";
import { authorizeAdmin } from "@/server/admin-auth";
import { createOrderFromQuote } from "@/server/orders";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// POST /api/admin/orders — promote a quote_request into an order. Server-to-server
// only (bearer ADMIN_API_TOKEN); 404 when the checkout seam is off. No UI.
export const Route = createFileRoute("/api/admin/orders")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const auth = authorizeAdmin(request);
        if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ ok: false, error: "Expected a JSON body." }, 400);
        }
        const parsed = createOrderInputSchema.safeParse(body);
        if (!parsed.success) {
          return json({ ok: false, error: "quote_request_id (uuid) is required." }, 400);
        }

        const result = await createOrderFromQuote(parsed.data.quote_request_id);
        if (!result.ok) return json({ ok: false, error: result.error }, result.status);
        return json({ ok: true, order: result.order }, 201);
      },
    },
  },
});

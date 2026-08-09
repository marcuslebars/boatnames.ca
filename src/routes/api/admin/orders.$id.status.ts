import { createFileRoute } from "@tanstack/react-router";

import { orderStatusPatchSchema } from "@/components/site/order-schema";
import { authorizeAdmin } from "@/server/admin-auth";
import { transitionOrder } from "@/server/orders";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// PATCH /api/admin/orders/:id/status — walk the order status ladder (legal
// transitions only), logging an order_events row per change. Server-to-server
// only (bearer ADMIN_API_TOKEN); 404 when the checkout seam is off.
export const Route = createFileRoute("/api/admin/orders/$id/status")({
  server: {
    handlers: {
      PATCH: async ({ request }: { request: Request }) => {
        const auth = authorizeAdmin(request);
        if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

        const id = new URL(request.url).pathname.match(/\/orders\/([^/]+)\/status$/)?.[1];
        if (!id) return json({ ok: false, error: "Order id required." }, 400);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ ok: false, error: "Expected a JSON body." }, 400);
        }
        const parsed = orderStatusPatchSchema.safeParse(body);
        if (!parsed.success) {
          return json({ ok: false, error: "A valid status is required." }, 400);
        }

        const result = await transitionOrder(id, parsed.data.status, {
          tracking_number: parsed.data.tracking_number,
          carrier: parsed.data.carrier,
        });
        if (!result.ok) return json({ ok: false, error: result.error }, result.status);
        return json({ ok: true, order: result.order }, 200);
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

import { startCheckout } from "@/server/checkout";
import { serverEnv } from "@/server/env";

/**
 * Buy-now → Stripe Checkout. Dark until CHECKOUT_ENABLED=1 (404). Recomputes the
 * price server-side from the design (never trusts a client price), creates a draft
 * order + a Stripe Checkout Session, and returns the hosted-checkout URL to redirect
 * to. The quote path is untouched and always available.
 */
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!serverEnv.checkoutEnabled()) return json({ error: "Checkout is not available." }, 404);

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "Expected JSON." }, 400);
        }
        const asStr = (v: unknown) => (typeof v === "string" ? v.trim() : "");

        const customerName = asStr(body.customer_name);
        const customerEmail = asStr(body.customer_email);
        if (!customerName || !/.+@.+\..+/.test(customerEmail)) {
          return json({ error: "A name and a valid email are required." }, 400);
        }
        const line = body.line === "acrylic" ? "acrylic" : body.line === "vinyl" ? "vinyl" : "";

        const result = await startCheckout({
          line,
          boatName: asStr(body.name),
          hailingPort: asStr(body.port),
          font: asStr(body.font),
          finish: asStr(body.finish),
          sizeIn: Number(body.size) || 0,
          customerName,
          customerEmail,
        });
        if (!result.ok) return json({ error: result.error }, result.status);
        return json({ url: result.url }, 200);
      },
    },
  },
});

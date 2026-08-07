import { createFileRoute } from "@tanstack/react-router";

import { serverEnv } from "@/server/env";
import { getPricingAdapter } from "@/server/pricing";
import { shippingCents } from "@/server/pricing/engine";

/**
 * Server-authoritative live price for the previewer. The ONLY place a price is
 * computed for the visitor path — the client never does pricing math and never
 * sends a price we trust. Dark until CHECKOUT_ENABLED=1: returns `disabled` so
 * no price leaves the server, and the previewer shows nothing price-related.
 *
 * Shipping here is the standard estimate (no address yet); territories + free-
 * over-$400 + tax are finalised by Stripe at checkout, where the server RECOMPUTES
 * the product price from the same engine and charges that number.
 */
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/price")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!serverEnv.checkoutEnabled()) return json({ status: "disabled" }, 200);

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ status: "error", error: "Expected JSON." }, 400);
        }

        const line = body.line === "acrylic" ? "acrylic" : body.line === "vinyl" ? "vinyl" : "";
        const asStr = (v: unknown) => (typeof v === "string" ? v : "");

        try {
          const result = await getPricingAdapter().price({
            productLine: line,
            fulfillment: "ship",
            design: {
              boatName: asStr(body.name),
              hailingPort: asStr(body.port),
              finish: asStr(body.finish),
              letterHeightIn: Number(body.size) || 0,
            },
          });

          if (result.status === "unpriced") {
            return json({ status: "unpriced", reason: result.reason }, 200);
          }

          const shipping = shippingCents(result.subtotalCents);
          return json(
            {
              status: "priced",
              currency: result.currency,
              lineItems: result.lineItems,
              subtotalCents: result.subtotalCents,
              shippingCents: shipping,
              totalCents: result.subtotalCents + shipping,
              pricingVersion: result.pricingVersion,
            },
            200,
          );
        } catch (err) {
          console.error("[api/price]", err);
          return json({ status: "error", error: "Could not price this design." }, 500);
        }
      },
    },
  },
});

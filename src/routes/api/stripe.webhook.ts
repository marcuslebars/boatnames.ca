import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";

import { handleCheckoutCompleted, handleRefund } from "@/server/checkout";
import { constructWebhookEvent } from "@/server/stripe";

/**
 * Stripe webhook. Signature-verified against STRIPE_WEBHOOK_SECRET over the RAW
 * body. Handlers are idempotent (Stripe redelivers until 2xx). A handler failure
 * returns 500 so Stripe retries; a bad signature is 400 and never processed.
 *
 * checkout.session.completed -> order paid; charge.refunded -> order refunded.
 * Other event types are acknowledged and ignored.
 */
export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 400 });

        const payload = await request.text(); // raw body — required for verification
        let event: Stripe.Event;
        try {
          event = constructWebhookEvent(payload, signature);
        } catch (err) {
          console.error("[stripe/webhook] signature verification failed:", err);
          return new Response("Invalid signature", { status: 400 });
        }

        try {
          switch (event.type) {
            case "checkout.session.completed":
              await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
              break;
            case "charge.refunded": {
              const charge = event.data.object as Stripe.Charge;
              const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
              if (pi) await handleRefund(pi);
              break;
            }
            default:
              break; // acknowledged, ignored
          }
        } catch (err) {
          console.error(`[stripe/webhook] handler error (${event.type}):`, err);
          return new Response("Handler error", { status: 500 }); // Stripe retries
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

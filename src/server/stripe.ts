import Stripe from "stripe";

import { serverEnv } from "./env";

/**
 * Stripe client + helpers. Server-only (the secret key never reaches the client;
 * the hosted-Checkout redirect flow needs no publishable key). Lazily constructed
 * so importing this never throws when checkout is off / keys are absent.
 */
let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!_stripe) {
    const key = serverEnv.stripeSecretKey();
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key); // apiVersion pinned by the SDK
  }
  return _stripe;
}

// Stripe tax codes: general tangible goods, and shipping. Used so automatic_tax
// can resolve GST/HST/PST from the customer's address.
const TAX_CODE_GOODS = "txcd_99999999";
const TAX_CODE_SHIPPING = "txcd_92010001";

export interface CheckoutLine {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface CreateSessionParams {
  orderId: string;
  email: string;
  currency: string; // "CAD"
  lines: CheckoutLine[];
  shippingCents: number; // standard/free estimate; territory reconciled in the webhook
  pricingVersion?: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create a hosted Checkout Session for an order. CAD, Stripe Tax on, shipping as
 * its own rate, address collected by Stripe (Canada only). `metadata.order_id`
 * ties the async webhook back to our order; the payment intent carries it too so
 * a refund event can be mapped back.
 */
export async function createCheckoutSession(
  p: CreateSessionParams,
): Promise<Stripe.Checkout.Session> {
  const currency = p.currency.toLowerCase();
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = p.lines.map((l) => ({
    quantity: l.quantity,
    price_data: {
      currency,
      unit_amount: l.unitPriceCents,
      tax_behavior: "exclusive",
      product_data: { name: l.description, tax_code: TAX_CODE_GOODS },
    },
  }));

  return stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: p.email,
    line_items,
    automatic_tax: { enabled: true },
    shipping_address_collection: { allowed_countries: ["CA"] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name:
            p.shippingCents === 0 ? "Free shipping (Canada-wide)" : "Shipping (Canada-wide)",
          fixed_amount: { amount: p.shippingCents, currency },
          tax_behavior: "exclusive",
          tax_code: TAX_CODE_SHIPPING,
        },
      },
    ],
    metadata: { order_id: p.orderId, pricing_version: p.pricingVersion ?? "" },
    payment_intent_data: { metadata: { order_id: p.orderId } },
    success_url: p.successUrl,
    cancel_url: p.cancelUrl,
  });
}

/** Verify + parse a webhook against STRIPE_WEBHOOK_SECRET. Throws on bad signature. */
export function constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
  const secret = serverEnv.stripeWebhookSecret();
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return stripe().webhooks.constructEvent(payload, signature, secret);
}

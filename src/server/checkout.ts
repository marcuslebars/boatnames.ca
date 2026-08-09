import { createHmac, timingSafeEqual } from "node:crypto";

import type Stripe from "stripe";

import { canTransition, type OrderStatus } from "@/components/site/order-schema";

import { sendEmail } from "./email";
import { serverEnv } from "./env";
import { orderConfirmationEmail, proofReadyEmail } from "./order-emails";
import { appendOrderEvent } from "./orders";
import { getPricingAdapter } from "./pricing";
import { shippingCents } from "./pricing/engine";
import { PRICING_VERSION } from "./pricing/rate-card";
import { createCheckoutSession } from "./stripe";
import { supabaseAdmin } from "./supabase";

// ---- Proof-approval token (stateless HMAC; no new secret, no DB column) --------

function proofSecret(): string {
  // The service-role key is a strong server-only secret that never reaches the
  // client — using it as an HMAC key does not expose it.
  return serverEnv.supabaseServiceRoleKey();
}
export function signProofToken(orderId: string): string {
  return createHmac("sha256", proofSecret()).update(`proof:${orderId}`).digest("hex");
}
export function verifyProofToken(orderId: string, token: string): boolean {
  const expected = Buffer.from(signProofToken(orderId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// ---- Start checkout: recompute price, create draft order, create Stripe session -

export interface CheckoutInput {
  line: string;
  boatName: string;
  hailingPort: string;
  font: string;
  finish: string;
  sizeIn: number;
  customerName: string;
  customerEmail: string;
}

export type CheckoutStart =
  | { ok: true; url: string; orderId: string }
  | { ok: false; status: number; error: string };

export async function startCheckout(input: CheckoutInput): Promise<CheckoutStart> {
  // Server-authoritative price — the number we charge, recomputed here. A client
  // never sends a price we trust.
  const priced = await getPricingAdapter().price({
    productLine: input.line,
    fulfillment: "ship",
    design: {
      boatName: input.boatName,
      hailingPort: input.hailingPort,
      font: input.font,
      finish: input.finish,
      letterHeightIn: input.sizeIn,
    },
  });
  if (priced.status !== "priced") {
    return { ok: false, status: 422, error: "This design is quote-only — please request a quote." };
  }
  const shipping = shippingCents(priced.subtotalCents); // standard/free estimate (no address yet)

  const admin = supabaseAdmin();
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      name: input.customerName,
      email: input.customerEmail,
      product_line: input.line,
      fulfillment: "ship",
      boat_name: input.boatName || null,
      hailing_port: input.hailingPort || null,
      font: input.font || null,
      finish: input.finish || null,
      letter_height_in: input.sizeIn,
      currency: priced.currency,
      subtotal_cents: priced.subtotalCents,
      shipping_cents: shipping,
      total_cents: priced.subtotalCents + shipping, // tax added by Stripe at checkout
      payment_provider: "stripe",
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !order) {
    console.error("[checkout] order insert failed:", error?.message);
    return { ok: false, status: 500, error: "Could not start checkout." };
  }
  const orderId = (order as { id: string }).id;
  await appendOrderEvent(orderId, "checkout_started", "system", {
    subtotal_cents: priced.subtotalCents,
    shipping_cents: shipping,
    pricing_version: PRICING_VERSION,
  });

  try {
    const session = await createCheckoutSession({
      orderId,
      email: input.customerEmail,
      currency: priced.currency,
      lines: priced.lineItems,
      shippingCents: shipping,
      pricingVersion: PRICING_VERSION,
      successUrl: `${serverEnv.siteUrl()}/order/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${serverEnv.siteUrl()}/?checkout=cancelled#previewer`,
    });
    if (!session.url) return { ok: false, status: 502, error: "Stripe returned no checkout URL." };
    await appendOrderEvent(orderId, "checkout_session_created", "system", {
      session_id: session.id,
    });
    return { ok: true, url: session.url, orderId };
  } catch (err) {
    console.error("[checkout] session create failed:", err);
    return { ok: false, status: 502, error: "Payment provider error. Please try again." };
  }
}

// ---- Webhook handlers (idempotent) --------------------------------------------

/** checkout.session.completed → draft->paid, writing address + amounts + Stripe refs. */
export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const orderId = session.metadata?.order_id;
  if (!orderId) {
    console.error("[webhook] completed: missing order_id metadata");
    return;
  }
  const admin = supabaseAdmin();
  const { data: existing } = await admin
    .from("orders")
    .select("status, email, boat_name, product_line, finish, letter_height_in, currency")
    .eq("id", orderId)
    .single();
  if (!existing) {
    console.error("[webhook] completed: order not found", orderId);
    return;
  }
  const row = existing as Record<string, unknown> & { status: OrderStatus };
  if (row.status !== "draft") {
    // Redelivery — Stripe retries until 2xx. Idempotent no-op.
    await appendOrderEvent(orderId, "webhook_duplicate", "webhook", {
      event: "checkout.session.completed",
      status: row.status,
    });
    return;
  }

  const details = session.collected_information?.shipping_details ?? null;
  const addr = details?.address ?? session.customer_details?.address ?? null;
  const province = addr?.state ?? null;
  const email = session.customer_details?.email ?? (row.email as string);
  const chargedShipping = session.shipping_cost?.amount_total ?? null;

  const patch: Record<string, unknown> = {
    status: "paid",
    email,
    ship_name: details?.name ?? session.customer_details?.name ?? null,
    ship_line1: addr?.line1 ?? null,
    ship_line2: addr?.line2 ?? null,
    ship_city: addr?.city ?? null,
    ship_province: province,
    ship_postal_code: addr?.postal_code ?? null,
    ship_country: addr?.country ?? null,
    tax_cents: session.total_details?.amount_tax ?? null,
    shipping_cents: chargedShipping,
    total_cents: session.amount_total ?? null,
    external_payment_ref:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from("orders").update(patch).eq("id", orderId);
  if (error) {
    console.error("[webhook] paid update failed:", error.message);
    throw new Error(error.message); // 500 -> Stripe retries
  }
  await appendOrderEvent(orderId, "status_changed:paid", "webhook", {
    from: "draft",
    to: "paid",
    session_id: session.id,
    amount_total: session.amount_total,
    payment_intent: patch.external_payment_ref,
  });

  // The address is only known now; a territory should have paid $65 vs the
  // standard/free estimate charged. Flag the difference for manual reconciliation.
  const rateCardShipping = shippingCents(
    Number(session.amount_subtotal ?? 0),
    province ?? undefined,
  );
  if (chargedShipping != null && rateCardShipping !== chargedShipping) {
    await appendOrderEvent(orderId, "shipping_reconcile", "system", {
      charged_cents: chargedShipping,
      rate_card_cents: rateCardShipping,
      province,
    });
  }

  try {
    const mail = orderConfirmationEmail({
      name: session.customer_details?.name ?? undefined,
      boatName: (row.boat_name as string | null) ?? undefined,
      productLine: (row.product_line as string | null) ?? undefined,
      finish: (row.finish as string | null) ?? undefined,
      letterHeightIn: (row.letter_height_in as number | null) ?? undefined,
      totalCents: session.amount_total,
      currency: (row.currency as string | null) ?? "CAD",
    });
    await sendEmail({ to: email, subject: mail.subject, html: mail.html, text: mail.text });
  } catch (e) {
    console.error("[webhook] confirmation email failed:", e); // non-blocking
  }
}

/** A refund is a financial fact — set `refunded` regardless of the source state,
 *  logging any anomaly so the DB never lies. Idempotent. */
export async function handleRefund(paymentIntentId: string): Promise<void> {
  const admin = supabaseAdmin();
  const { data: order } = await admin
    .from("orders")
    .select("id, status")
    .eq("external_payment_ref", paymentIntentId)
    .single();
  if (!order) {
    console.error("[webhook] refund: no order for payment_intent", paymentIntentId);
    return;
  }
  const o = order as { id: string; status: OrderStatus };
  if (o.status === "refunded") return; // idempotent
  if (!canTransition(o.status, "refunded")) {
    await appendOrderEvent(o.id, "refund_unexpected_state", "webhook", { status: o.status });
  }
  await admin
    .from("orders")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("id", o.id);
  await appendOrderEvent(o.id, "status_changed:refunded", "webhook", {
    from: o.status,
    payment_intent: paymentIntentId,
  });
}

// ---- Proof: admin sends it, customer approves via the signed link -------------

export async function sendProofEmail(
  orderId: string,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const admin = supabaseAdmin();
  const { data: order } = await admin
    .from("orders")
    .select("email, boat_name, product_line, finish, letter_height_in, status")
    .eq("id", orderId)
    .single();
  if (!order) return { ok: false, status: 404, error: "Order not found." };
  const o = order as Record<string, unknown> & { status: OrderStatus; email: string };
  if (o.status !== "paid") {
    return {
      ok: false,
      status: 409,
      error: `Proof is only sent for a paid order (this is ${o.status}).`,
    };
  }
  const token = signProofToken(orderId);
  const approveUrl = `${serverEnv.siteUrl()}/api/orders/approve?order=${orderId}&token=${token}`;
  const mail = proofReadyEmail(
    {
      boatName: (o.boat_name as string | null) ?? undefined,
      productLine: (o.product_line as string | null) ?? undefined,
      finish: (o.finish as string | null) ?? undefined,
      letterHeightIn: (o.letter_height_in as number | null) ?? undefined,
    },
    approveUrl,
  );
  try {
    await sendEmail({ to: o.email, subject: mail.subject, html: mail.html, text: mail.text });
  } catch (e) {
    console.error("[proof] email failed:", e);
    return { ok: false, status: 502, error: "Could not send the proof email." };
  }
  await appendOrderEvent(orderId, "proof_sent", "admin", { to: o.email });
  return { ok: true, status: 200 };
}

export async function approveProof(
  orderId: string,
  token: string,
): Promise<{ ok: boolean; status: number; message: string }> {
  if (!verifyProofToken(orderId, token)) {
    return { ok: false, status: 403, message: "This approval link isn't valid." };
  }
  const admin = supabaseAdmin();
  const { data: order } = await admin.from("orders").select("status").eq("id", orderId).single();
  if (!order) return { ok: false, status: 404, message: "Order not found." };
  const from = (order as { status: OrderStatus }).status;
  if (
    from === "proofed" ||
    from === "in_production" ||
    from === "shipped" ||
    from === "completed"
  ) {
    return { ok: true, status: 200, message: "Already approved — thank you." }; // idempotent
  }
  if (!canTransition(from, "proofed")) {
    return {
      ok: false,
      status: 409,
      message: "This order can't be approved from its current state.",
    };
  }
  await admin
    .from("orders")
    .update({ status: "proofed", updated_at: new Date().toISOString() })
    .eq("id", orderId);
  await appendOrderEvent(orderId, "status_changed:proofed", "system", {
    from,
    to: "proofed",
    via: "customer_approval",
  });
  return { ok: true, status: 200, message: "Approved — production is starting. Thank you!" };
}

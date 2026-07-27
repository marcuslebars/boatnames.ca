import {
  canTransition,
  type OrderEventActor,
  type OrderStatus,
} from "@/components/site/order-schema";

import { getPricingAdapter } from "./pricing";
import { supabaseAdmin } from "./supabase";

export type OrderResult =
  | { ok: true; order: Record<string, unknown> }
  | { ok: false; status: 400 | 404 | 500; error: string };

/** Append-only order event. Best-effort — a log failure never blocks the change. */
export async function appendOrderEvent(
  orderId: string,
  eventType: string,
  actor: OrderEventActor,
  payload?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("order_events")
    .insert({ order_id: orderId, event_type: eventType, actor, payload: payload ?? null });
  if (error) console.error("[orders] event insert failed:", error.message);
}

/**
 * Promote a quote into an order: copy the design config, set provider `manual`
 * and status `draft`. The quote row is unchanged (quotes are inquiries, orders
 * are commitments). Returns the new order.
 */
export async function createOrderFromQuote(quoteRequestId: string): Promise<OrderResult> {
  const admin = supabaseAdmin();
  const { data: quote, error: qErr } = await admin
    .from("quote_requests")
    .select(
      "id, name, email, phone, product_line, fulfillment, boat_name, hailing_port, font, finish, letter_height_in, run_length_in",
    )
    .eq("id", quoteRequestId)
    .single();
  if (qErr || !quote) return { ok: false, status: 404, error: "Quote not found." };
  const q = quote as Record<string, unknown>;

  const { data: order, error: oErr } = await admin
    .from("orders")
    .insert({
      quote_request_id: q.id,
      name: q.name,
      email: q.email,
      phone: q.phone ?? null,
      product_line: q.product_line ?? "acrylic",
      fulfillment: q.fulfillment ?? "ship",
      boat_name: q.boat_name ?? null,
      hailing_port: q.hailing_port ?? null,
      font: q.font ?? null,
      finish: q.finish ?? null,
      letter_height_in: q.letter_height_in ?? null,
      run_length_in: q.run_length_in ?? null,
      payment_provider: "manual",
      status: "draft",
    })
    .select("*")
    .single();
  if (oErr || !order) {
    console.error("[orders] create failed:", oErr?.message);
    return { ok: false, status: 500, error: "Could not create order." };
  }

  const created = order as Record<string, unknown>;
  await appendOrderEvent(created.id as string, "order_created", "admin", {
    from_quote: quoteRequestId,
  });
  return { ok: true, order: created };
}

/**
 * Walk an order along the status ladder with legal-transition validation, logging
 * an order_events row per change. On `invoiced` it consults the pricing adapter —
 * `manual` (launch) returns unpriced, so amounts stay null and the event records
 * that pricing was manual. The pricing seam is reachable ONLY from here.
 */
export async function transitionOrder(orderId: string, to: OrderStatus): Promise<OrderResult> {
  const admin = supabaseAdmin();
  const { data: existing, error: eErr } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (eErr || !existing) return { ok: false, status: 404, error: "Order not found." };
  const order = existing as Record<string, unknown> & { status: OrderStatus };
  const from = order.status;

  if (!canTransition(from, to)) {
    return { ok: false, status: 400, error: `Illegal transition: ${from} -> ${to}.` };
  }

  const patch: Record<string, unknown> = { status: to, updated_at: new Date().toISOString() };
  let pricingNote: Record<string, unknown> | undefined;

  if (to === "invoiced") {
    const adapter = getPricingAdapter();
    const priced = await adapter.price({
      productLine: String(order.product_line ?? ""),
      fulfillment: String(order.fulfillment ?? ""),
      design: {
        boatName: (order.boat_name as string | null) ?? undefined,
        hailingPort: (order.hailing_port as string | null) ?? undefined,
        font: (order.font as string | null) ?? undefined,
        finish: (order.finish as string | null) ?? undefined,
        letterHeightIn: (order.letter_height_in as number | null) ?? undefined,
        runLengthIn: (order.run_length_in as number | null) ?? undefined,
      },
      destinationProvince: (order.ship_province as string | null) ?? undefined,
    });
    if (priced.status === "priced") {
      patch.currency = priced.currency;
      patch.subtotal_cents = priced.subtotalCents;
      patch.total_cents = priced.subtotalCents; // tax/shipping resolved by a later phase
      pricingNote = { adapter: adapter.name, priced: true };
    } else {
      // unpriced: amounts stay null; the event records manual pricing.
      pricingNote = { adapter: adapter.name, priced: false, reason: priced.reason };
    }
  }

  const { data: updated, error: uErr } = await admin
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .select("*")
    .single();
  if (uErr || !updated) {
    console.error("[orders] update failed:", uErr?.message);
    return { ok: false, status: 500, error: "Could not update order." };
  }

  await appendOrderEvent(orderId, `status_changed:${to}`, "admin", {
    from,
    to,
    ...(pricingNote ? { pricing: pricingNote } : {}),
  });
  return { ok: true, order: updated as Record<string, unknown> };
}

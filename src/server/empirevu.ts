/**
 * boatnames.ca → EmpireVu lead forward.
 *
 * boatnames.ca is a NEW EmpireVu company (slug `a1-boatnames`) under the
 * `a1-group` org — NOT a service line of a1-marine-care. The intake resolves the
 * company from `sourceSite` at lead time, so sourceSite is "boatnames" and the
 * a1-boatnames company MUST be seeded in the EmpireVu repo before the gate flips
 * (a lead arriving first lands in raw_leads instead of matching a contact). The
 * `source` tag splits by intent (boatnames_quote_ship / _install / _unsure) for
 * attribution. The envelope shape is the shared contract (leadEnvelopeSchema);
 * the golden fixtures pin this builder's output.
 *
 * The canonical envelope has no structured slot for the design/tier specifics and
 * no consent field, and the intake STRIPS unknown keys — so the product line +
 * fulfillment + design specs + preview/photo URLs are folded into the free-text
 * `message` (as the siblings fold their quote details), and the CASL consent
 * record stays only in boatnames' own quote_requests, never invented into the
 * envelope.
 *
 * signEmpireVuBody + forwardToEmpireVu are copied VERBATIM from the Care spoke —
 * do not rewrite the signing or transport.
 */
import { createHmac } from "node:crypto";

export interface LeadLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface LeadEnvelope {
  schemaVersion: 1;
  source: string;
  sourceSite: string;
  formType: "quote" | "contact" | "booking";
  receivedAt: string;
  contact: { name?: string; email?: string; phone?: string };
  message?: string;
  lineItems?: LeadLineItem[];
  asset?: { makeModel?: string; lengthFt?: number; type?: string; marina?: string };
  meta?: {
    site?: string;
    page?: string;
    preferredDate?: string;
    preferredTime?: string;
    utm?: Record<string, string>;
  };
}

/** Brand id the intake maps to the a1-boatnames company (must be seeded first). */
export const BOATNAMES_SOURCE_SITE = "boatnames";
/** Attributable source tag, split by fulfillment intent for reporting. */
export function boatnamesSource(fulfillment: string | undefined): string {
  const tier = fulfillment === "install" || fulfillment === "ship" ? fulfillment : "unsure";
  return `boatnames_quote_${tier}`;
}

/** The quote lead, already validated + label-resolved by the API route. */
export interface BoatnamesLead {
  name: string;
  email: string;
  phone?: string;
  boatModel?: string; // make/model -> asset.makeModel
  marina?: string; // -> asset.marina
  boatName?: string; // wanted lettering name
  hailingPort?: string;
  font?: string; // human label, e.g. "Transom Serif"
  finish?: string; // human label, e.g. "Mirror Gold"
  line?: string; // product line: "vinyl" | "acrylic"
  fulfillment?: string; // "ship" | "install" | "unsure"
  letterHeightIn?: number;
  runLengthIn?: number;
  transomWidthIn?: number;
  notes?: string;
  photoUrl?: string;
  previewUrl?: string;
  utm?: Record<string, string>;
}

function compact<T extends Record<string, unknown>>(obj: T): T | undefined {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return Object.keys(out).length ? (out as T) : undefined;
}

function joinText(...parts: Array<string | undefined>): string | undefined {
  const text = parts.filter((p): p is string => Boolean(p && p.trim())).join("\n\n");
  return text || undefined;
}

const FULFILLMENT_LABEL: Record<string, string> = {
  ship: "Ship anywhere in Canada",
  install: "White-glove install (Georgian Bay / Simcoe / Trent-Severn)",
  unsure: "Not sure yet",
};

/**
 * Fold the product line, fulfillment, design, and links into the one free-text
 * field the contract preserves. The intake stores `message` on the contact +
 * activity + notification, so this is where the team reads the details in EmpireVu.
 */
function buildMessage(lead: BoatnamesLead): string | undefined {
  const product = lead.line === "vinyl" ? "Cut vinyl" : "Cast acrylic";
  const design = [
    lead.boatName?.trim() ? `"${lead.boatName.trim()}"` : undefined,
    lead.hailingPort?.trim() ? `Port: ${lead.hailingPort.trim()}` : undefined,
    lead.font,
    lead.finish,
    lead.letterHeightIn ? `${lead.letterHeightIn}" letters` : undefined,
    lead.runLengthIn ? `~${lead.runLengthIn}" run` : undefined,
  ].filter((p): p is string => Boolean(p));

  const lines = [
    `${product} boat name lettering${design.length ? ` — ${design.join(" · ")}` : ""}.`,
  ];
  if (lead.fulfillment) {
    lines.push(`Fulfillment: ${FULFILLMENT_LABEL[lead.fulfillment] ?? lead.fulfillment}.`);
  }
  if (lead.transomWidthIn) lines.push(`Transom width: ${lead.transomWidthIn}".`);
  if (lead.previewUrl) lines.push(`Preview: ${lead.previewUrl}`);
  if (lead.photoUrl) lines.push(`Photo: ${lead.photoUrl}`);

  return joinText(lines.join("\n"), lead.notes);
}

/**
 * Map a boatnames.ca lead to the canonical envelope. Mirrors the sibling builders.
 *
 * Forward-compat (Phase 8 checkout seam): this builder reads ONLY the lead fields
 * referenced below. Product line + fulfillment already ride the free-text `message`
 * (added in the rebrand). If a future order ever needs to reference its order id in
 * the lead, it folds into `message` (or `meta`) — NEVER a new top-level key: the
 * intake strips unknown keys (LEAD_SCHEMA.md / leadEnvelopeSchema), so order-domain
 * data cannot ride as structured fields. The "ignores order-domain fields" test pins
 * this so future order work can't leak schema-invalid keys into the lead envelope.
 */
export function buildBoatnamesEnvelope(lead: BoatnamesLead, receivedAt: string): LeadEnvelope {
  const page = lead.fulfillment === "install" ? "/install" : "/#quote";
  return {
    schemaVersion: 1,
    source: boatnamesSource(lead.fulfillment),
    sourceSite: BOATNAMES_SOURCE_SITE,
    formType: "quote",
    receivedAt,
    contact: { name: lead.name, email: lead.email, phone: lead.phone },
    message: buildMessage(lead),
    asset: compact({ makeModel: lead.boatModel, marina: lead.marina }),
    meta: compact({ site: "boatnames.ca", page, utm: lead.utm }) ?? { site: "boatnames.ca" },
  };
}

// ── Paid-order forward (Phase 5) ──────────────────────────────────────────────
// A paid order forwards through the SAME envelope contract — no new top-level
// keys, no structured order fields (the intake strips unknowns). The order id +
// amount ride the free-text `message` (the extension point); the distinct
// `source` tag "boatnames_order_paid" separates orders from quotes for reporting.
// Cross-repo: the a1-boatnames company + an order fixture must be synced in the
// EmpireVu intake before this goes live (same gate as the quote forward).

export function boatnamesOrderSource(): string {
  return "boatnames_order_paid";
}

export interface BoatnamesOrder {
  orderId: string;
  name: string;
  email: string;
  phone?: string;
  boatName?: string;
  hailingPort?: string;
  font?: string;
  finish?: string;
  line?: string;
  letterHeightIn?: number;
  totalCents?: number;
  currency?: string;
  shipCity?: string;
  shipProvince?: string;
}

function orderAmount(cents: number | undefined, currency: string): string | undefined {
  if (cents == null) return undefined;
  return `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)} ${currency}`;
}

export function buildBoatnamesOrderEnvelope(
  order: BoatnamesOrder,
  receivedAt: string,
): LeadEnvelope {
  const product = order.line === "vinyl" ? "Cut vinyl" : "Cast acrylic";
  const design = [
    order.boatName?.trim() ? `"${order.boatName.trim()}"` : undefined,
    order.hailingPort?.trim() ? `Port: ${order.hailingPort.trim()}` : undefined,
    order.font,
    order.finish,
    order.letterHeightIn ? `${order.letterHeightIn}" letters` : undefined,
  ].filter((p): p is string => Boolean(p));
  const amount = orderAmount(order.totalCents, order.currency ?? "CAD");
  const shipTo = [order.shipCity, order.shipProvince].filter(Boolean).join(", ");

  const message = [
    `PAID ORDER — ${product} boat name lettering${design.length ? ` — ${design.join(" · ")}` : ""}.`,
    amount ? `Paid: ${amount} (incl. tax).` : undefined,
    `Order ref: ${order.orderId}.`,
    shipTo ? `Ship to: ${shipTo}.` : undefined,
  ]
    .filter((p): p is string => Boolean(p))
    .join("\n");

  return {
    schemaVersion: 1,
    source: boatnamesOrderSource(),
    sourceSite: BOATNAMES_SOURCE_SITE,
    formType: "quote",
    receivedAt,
    contact: { name: order.name, email: order.email, phone: order.phone },
    message,
    meta: { site: "boatnames.ca", page: "/order" },
  };
}

// ── HMAC + transport — copied VERBATIM from the Care spoke ────────────────────

export function signEmpireVuBody(rawBody: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ForwardResult {
  outcome: "sent" | "failed" | "skipped_gated";
  status?: number;
  error?: string;
  attempts: number;
}

/**
 * Fan out an envelope to EmpireVu's /api/intake. Never throws. Skips cleanly if
 * unconfigured or disabled. In THIS repo the gate defaults to disabled, so a
 * submission still builds + persists the envelope (outbox) but makes no call.
 *
 * Returns the outcome so the caller can mark the outbox row. The transport
 * (rawBody = JSON.stringify(envelope), x-empirevu-signature, retry/backoff) is
 * the sibling implementation verbatim.
 */
export async function forwardToEmpireVu(
  envelope: LeadEnvelope,
  attempts = 3,
): Promise<ForwardResult> {
  if (process.env.EMPIREVU_INTAKE_DISABLED === "1") {
    return { outcome: "skipped_gated", attempts: 0 };
  }
  const url = process.env.EMPIREVU_INTAKE_URL;
  const secret = process.env.EMPIREVU_INTAKE_SECRET;
  if (!url || !secret) {
    console.log(
      "[empirevu] EMPIREVU_INTAKE_URL/SECRET not set — skipping (durable log + outbox unaffected)",
    );
    return { outcome: "skipped_gated", attempts: 0 };
  }
  const rawBody = JSON.stringify(envelope);
  const headers = {
    "Content-Type": "application/json",
    "x-empirevu-signature": signEmpireVuBody(rawBody, secret),
  };

  let lastError: string | undefined;
  let lastStatus: number | undefined;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers, body: rawBody });
      if (res.ok) {
        console.log(
          `[empirevu] forwarded ${envelope.formType} (attempt ${attempt}, ${res.status})`,
        );
        return { outcome: "sent", status: res.status, attempts: attempt };
      }
      lastStatus = res.status;
      lastError = `intake responded ${res.status}`;
      console.error(`[empirevu] responded ${res.status} (attempt ${attempt})`);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[empirevu] forward failed (attempt ${attempt}):`, lastError);
    }
    if (attempt < attempts) await sleep(attempt * 750);
  }
  console.error(
    `[empirevu] gave up after ${attempts} attempts — durable log + outbox still hold the lead`,
  );
  return { outcome: "failed", status: lastStatus, error: lastError, attempts };
}

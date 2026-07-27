/**
 * Holy Ship → EmpireVu lead forward (4th spoke, after Care, Storage, Coatings).
 *
 * Mirrors the sibling spokes (a1marinecare/src/lib/empirevu.ts,
 * a1marinestorage/server/empirevu.ts). Holy Ship is a Care PROPERTY, so
 * sourceSite stays "a1marinecare"; the `source` tag is distinct so holyship
 * traffic is attributable separately. The envelope shape is the shared contract
 * (syncoree/docs/LEAD_SCHEMA.md, leadEnvelopeSchema). The golden fixtures pin
 * this builder's output.
 *
 * The canonical envelope has no structured slot for the acrylic specifics and no
 * consent field, and the intake STRIPS unknown keys — so per decision (see
 * CLAUDE.md / commit): the acrylic specs + preview/photo URLs are folded into the
 * free-text `message` (as Care & Storage fold their quote details), and the CASL
 * consent record is kept only in Holy Ship's own quote_requests, never invented
 * into the envelope.
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

/** Attributable Holy Ship source tag (distinct from the main Care site). */
export const HOLYSHIP_SOURCE = "holyship_acrylic_quote";
/** Brand id — Holy Ship is a Care property, so it routes to the Care company. */
export const HOLYSHIP_SOURCE_SITE = "a1marinecare";

/** The acrylic-quote lead, already validated + label-resolved by the API route. */
export interface HolyShipLead {
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

/**
 * Fold the acrylic design + links into the one free-text field the contract
 * preserves. The intake stores `message` on the contact + activity + notification,
 * so this is where the A1 team reads the design details in EmpireVu.
 */
function buildMessage(lead: HolyShipLead): string | undefined {
  const design = [
    lead.boatName?.trim() ? `"${lead.boatName.trim()}"` : undefined,
    lead.hailingPort?.trim() ? `Port: ${lead.hailingPort.trim()}` : undefined,
    lead.font,
    lead.finish,
    lead.letterHeightIn ? `${lead.letterHeightIn}" letters` : undefined,
    lead.runLengthIn ? `~${lead.runLengthIn}" run` : undefined,
  ].filter((p): p is string => Boolean(p));

  const lines = [
    `Custom cast acrylic transom lettering${design.length ? ` — ${design.join(" · ")}` : ""}.`,
  ];
  if (lead.transomWidthIn) lines.push(`Transom width: ${lead.transomWidthIn}".`);
  if (lead.previewUrl) lines.push(`Preview: ${lead.previewUrl}`);
  if (lead.photoUrl) lines.push(`Photo: ${lead.photoUrl}`);

  return joinText(lines.join("\n"), lead.notes);
}

/** Map a Holy Ship lead to the canonical envelope. Mirrors buildCareEnvelope. */
export function buildHolyShipEnvelope(lead: HolyShipLead, receivedAt: string): LeadEnvelope {
  return {
    schemaVersion: 1,
    source: HOLYSHIP_SOURCE,
    sourceSite: HOLYSHIP_SOURCE_SITE,
    formType: "quote",
    receivedAt,
    contact: { name: lead.name, email: lead.email, phone: lead.phone },
    message: buildMessage(lead),
    asset: compact({ makeModel: lead.boatModel, marina: lead.marina }),
    meta: compact({ site: "holyship.a1marinecare.ca", page: "/#quote", utm: lead.utm }) ?? {
      site: "holyship.a1marinecare.ca",
    },
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

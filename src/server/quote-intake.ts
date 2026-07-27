import { FINISH_OPTIONS, FONT_OPTIONS } from "@/components/site/previewer-types";
import {
  HONEYPOT_FIELD,
  MIN_FILL_MS,
  type QuoteInput,
  quoteSchema,
  TIMING_FIELD,
} from "@/components/site/quote-schema";

import { sendLeadNotification } from "./email";
import { buildHolyShipEnvelope, type HolyShipLead } from "./empirevu";
import type { SniffedImageType } from "./magic-bytes";
import { forwardAndMark, insertOutbox } from "./outbox";
import { checkRateLimit } from "./rate-limit";
import { uploadQuotePhoto } from "./storage";
import { supabaseAdmin } from "./supabase";

export interface QuoteSubmission {
  fields: Record<string, string>;
  photo: { bytes: Uint8Array; type: SniffedImageType } | null;
  ip: string;
  userAgent: string | null;
  referrer: string | null;
}

export type QuoteOutcome = {
  status: 200 | 400 | 429 | 500;
  body:
    | { ok: true; id?: string; previewUrl?: string }
    | { ok: false; error: string; fieldErrors?: Record<string, string> };
};

function numberOrNull(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function collectUtm(fields: Record<string, string>): Record<string, string> | undefined {
  const utm: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (k.startsWith("utm_") && v) utm[k] = v;
  }
  return Object.keys(utm).length ? utm : undefined;
}

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

async function markRaw(
  id: string | null,
  patch: { valid: boolean; reason?: string; quoteRequestId?: string },
): Promise<void> {
  if (!id) return;
  try {
    await supabaseAdmin()
      .from("raw_submissions")
      .update({
        valid: patch.valid,
        reason: patch.reason ?? null,
        quote_request_id: patch.quoteRequestId ?? null,
      })
      .eq("id", id);
  } catch (err) {
    console.error("[quote] raw_submissions update failed:", err);
  }
}

/**
 * Orchestrate a quote submission. Order is deliberate (never lose a lead):
 * raw capture -> bot filters (silent 200) -> validate -> rate limit -> upload ->
 * DURABLE lead + outbox insert -> return success -> non-blocking email + gated
 * EmpireVu forward.
 */
export async function handleQuoteSubmission(sub: QuoteSubmission): Promise<QuoteOutcome> {
  const admin = supabaseAdmin();
  const { fields, photo, ip, userAgent, referrer } = sub;

  // (0) Capture the untouched payload FIRST — recoverable even if everything
  // after this fails. Best-effort (a capture failure must not drop the lead).
  let rawId: string | null = null;
  try {
    const { data } = await admin
      .from("raw_submissions")
      .insert({ raw_payload: { ...fields, _hasPhoto: Boolean(photo) }, ip, user_agent: userAgent })
      .select("id")
      .single();
    rawId = (data as { id: string } | null)?.id ?? null;
  } catch (err) {
    console.error("[quote] raw capture failed:", err);
  }

  // (1) Anti-bot: honeypot + submit-timing. Return a bland 200 so bots learn
  // nothing about why they were dropped.
  if ((fields[HONEYPOT_FIELD] ?? "").trim().length > 0) {
    await markRaw(rawId, { valid: false, reason: "honeypot" });
    return { status: 200, body: { ok: true } };
  }
  const startedAt = Number(fields[TIMING_FIELD]);
  if (Number.isFinite(startedAt) && Date.now() - startedAt < MIN_FILL_MS) {
    await markRaw(rawId, { valid: false, reason: "too-fast" });
    return { status: 200, body: { ok: true } };
  }

  // (2) Validate (never trust the client, which validated the same schema).
  const parsed = quoteSchema.safeParse(fields);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    await markRaw(rawId, { valid: false, reason: "schema" });
    return { status: 400, body: { ok: false, error: "Some fields need attention.", fieldErrors } };
  }
  const v = parsed.data;

  // (3) Rate limit by IP (5/hour, Postgres-backed).
  const rl = await checkRateLimit(ip);
  if (!rl.allowed) {
    await markRaw(rawId, { valid: false, reason: "rate-limited" });
    return {
      status: 429,
      body: { ok: false, error: "That's a few too many requests — please try again later." },
    };
  }

  // (4) Store the photo (already sniffed valid by the route). Non-fatal on failure.
  let photoPath: string | null = null;
  let photoUrl: string | null = null;
  if (photo) {
    try {
      const stored = await uploadQuotePhoto(photo.bytes, photo.type);
      photoPath = stored.path;
      photoUrl = stored.signedUrl;
    } catch (err) {
      console.error("[quote] photo upload failed (continuing without it):", err);
    }
  }

  const fontLabel = FONT_OPTIONS.find((f) => f.key === v.font)?.label;
  const finishLabel = FINISH_OPTIONS.find((f) => f.key === v.finish)?.label;
  const runLengthIn = numberOrNull(fields.run_length);
  const previewUrl = fields.preview_url || undefined;
  const utm = collectUtm(fields);

  // (5) DURABLE lead write. Success is returned only after this succeeds.
  const { data: insData, error: insErr } = await admin
    .from("quote_requests")
    .insert({
      name: v.name,
      email: v.email,
      phone: v.phone ?? null,
      boat_model: v.boat_model ?? null,
      marina: v.marina ?? null,
      transom_width_in: v.transom_width ?? null,
      boat_name: v.boat_name ?? null,
      hailing_port: v.hailing_port ?? null,
      font: v.font,
      finish: v.finish,
      letter_height_in: v.letter_height,
      run_length_in: runLengthIn,
      notes: v.notes ?? null,
      photo_path: photoPath,
      photo_url: photoUrl,
      consent_text: fields.consent_text || null,
      consent_at: new Date().toISOString(),
      consent_ip: ip,
      source: fields.source || "boatnames.ca",
      preview_url: previewUrl ?? null,
      utm: utm ?? null,
      referrer,
      user_agent: userAgent,
      ip,
      status: "new",
    })
    .select("id")
    .single();

  if (insErr || !insData) {
    console.error("[quote] lead insert failed:", insErr);
    return {
      status: 500,
      body: { ok: false, error: "We couldn't record your request. Please try again." },
    };
  }
  const quoteId = (insData as { id: string }).id;
  await markRaw(rawId, { valid: true, quoteRequestId: quoteId });

  // (6) Build + persist the signed-lead envelope (durable) — even though the
  // forward is gated off, so flipping it on later is a controlled replay.
  const lead: HolyShipLead = {
    name: v.name,
    email: v.email,
    phone: v.phone,
    boatModel: v.boat_model,
    marina: v.marina,
    boatName: v.boat_name,
    hailingPort: v.hailing_port,
    font: fontLabel,
    finish: finishLabel,
    letterHeightIn: v.letter_height,
    runLengthIn: runLengthIn ?? undefined,
    transomWidthIn: v.transom_width,
    notes: v.notes,
    photoUrl: photoUrl ?? undefined,
    previewUrl,
    utm,
  };
  const envelope = buildHolyShipEnvelope(lead, new Date().toISOString());
  const outboxId = await insertOutbox(quoteId, quoteId, envelope);

  // (7) Non-blocking follow-up. The visitor's success is already decided; the
  // email + gated forward run fire-and-forget and can only mark the outbox row.
  void sendLeadNotification(
    buildLeadEmail(v, { fontLabel, finishLabel, runLengthIn, photoUrl, previewUrl, quoteId }),
  ).catch((err) => console.error("[quote] notification failed:", err));
  if (outboxId) {
    void forwardAndMark(outboxId, envelope).catch((err) =>
      console.error("[quote] forward failed:", err),
    );
  }

  return { status: 200, body: { ok: true, id: quoteId, previewUrl } };
}

function buildLeadEmail(
  v: QuoteInput,
  extra: {
    fontLabel?: string;
    finishLabel?: string;
    runLengthIn: number | null;
    photoUrl: string | null;
    previewUrl?: string;
    quoteId: string;
  },
) {
  const name = v.boat_name || "(no name yet)";
  const subject = `New Holy Ship quote — "${name}"${extra.finishLabel ? ` · ${extra.finishLabel}` : ""}`;

  const rows: Array<[string, string | undefined]> = [
    ["Name", v.name],
    ["Email", v.email],
    ["Phone", v.phone],
    ["Boat", v.boat_model],
    ["Marina / town", v.marina],
    ["Transom width", v.transom_width ? `${v.transom_width}"` : undefined],
    ["Boat name", v.boat_name],
    ["Hailing port", v.hailing_port],
    ["Font", extra.fontLabel ?? v.font],
    ["Finish", extra.finishLabel ?? v.finish],
    ["Letter height", `${v.letter_height}"`],
    ["Est. run length", extra.runLengthIn ? `${extra.runLengthIn}"` : undefined],
    ["Notes", v.notes],
    ["Photo", extra.photoUrl ?? "(none)"],
    ["Preview", extra.previewUrl],
    ["Lead id", extra.quoteId],
  ];
  const present = rows.filter(([, value]) => value != null && value !== "");

  const text = present.map(([k, value]) => `${k}: ${value}`).join("\n");
  const html = `<h2>New Holy Ship quote</h2><table cellpadding="6" style="border-collapse:collapse">${present
    .map(
      ([k, value]) =>
        `<tr><td style="font-weight:600;vertical-align:top">${esc(k)}</td><td>${esc(String(value))}</td></tr>`,
    )
    .join("")}</table>`;

  return { subject, html, text };
}

import { forwardToEmpireVu, type ForwardResult, type LeadEnvelope } from "./empirevu";
import { supabaseAdmin } from "./supabase";

/**
 * Persist the signed-lead envelope so it survives even while the forward is gated
 * off — flipping the gate on later is a controlled replay, not a cold launch.
 * idempotencyKey = the quote_request id (unique), the "request ID" the intake
 * replay path dedupes MY re-sends on. Returns the outbox row id.
 */
export async function insertOutbox(
  quoteRequestId: string,
  idempotencyKey: string,
  envelope: LeadEnvelope,
): Promise<string | null> {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("empirevu_outbox")
    .insert({
      quote_request_id: quoteRequestId,
      idempotency_key: idempotencyKey,
      envelope,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) {
    console.error("[outbox] insert failed:", error.message);
    return null;
  }
  return (data as { id: string }).id;
}

export async function markOutbox(id: string, result: ForwardResult): Promise<void> {
  const admin = supabaseAdmin();
  const { error } = await admin
    .from("empirevu_outbox")
    .update({
      status: result.outcome,
      attempts: result.attempts,
      last_error: result.error ?? null,
      response_status: result.status ?? null,
      sent_at: result.outcome === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) console.error("[outbox] mark failed:", error.message);
}

/**
 * Forward a persisted outbox row and record the outcome. Best-effort: with the
 * gate off it resolves to `skipped_gated` and makes no call; with the gate on and
 * the intake killed mid-flight it resolves to `failed` and marks the row — never
 * throwing, never affecting the visitor's already-returned success.
 */
export async function forwardAndMark(outboxId: string, envelope: LeadEnvelope): Promise<void> {
  const result = await forwardToEmpireVu(envelope);
  await markOutbox(outboxId, result);
}

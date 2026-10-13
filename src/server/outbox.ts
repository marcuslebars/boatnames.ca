import { forwardToEverdoer, type ForwardResult, type LeadEnvelope } from "./everdoer";
import { supabaseAdmin } from "./supabase";

// ── Outbox table name (Everdoer rebrand) ──────────────────────────────────────
// Rebrand shim (remove once migration 20261013000000 is applied everywhere)
// Migration 20261013000000 renames empirevu_outbox -> everdoer_outbox. If this
// code is deployed BEFORE that migration runs, PostgREST reports the new table as
// missing; fall back to the legacy name (and remember it for this process) so the
// durable outbox write never drops a lead envelope. After the migration the old
// name is a compat view, so a process stuck on it keeps working too.
export const OUTBOX_TABLE = "everdoer_outbox";
export const LEGACY_OUTBOX_TABLE = "empirevu_outbox";
let outboxTableName: string = OUTBOX_TABLE;

interface PostgrestLikeError {
  code?: string;
  message: string;
}

/** PGRST205 = not in PostgREST's schema cache; 42P01 = undefined_table. */
function isMissingTable(error: PostgrestLikeError | null): boolean {
  return error != null && (error.code === "PGRST205" || error.code === "42P01");
}

/**
 * Run one outbox query against the current table name; if the new table is
 * missing, switch to the legacy name once (per process), log it, and retry.
 * Rebrand shim (remove once migration 20261013000000 is applied everywhere)
 */
export async function withOutboxTable<R extends { error: PostgrestLikeError | null }>(
  query: (table: string) => PromiseLike<R>,
): Promise<R> {
  const table = outboxTableName;
  const result = await query(table);
  if (table === OUTBOX_TABLE && isMissingTable(result.error)) {
    if (outboxTableName === OUTBOX_TABLE) {
      outboxTableName = LEGACY_OUTBOX_TABLE;
      console.warn(
        "[everdoer] everdoer_outbox missing; using legacy empirevu_outbox until migration 20261013000000 is applied",
      );
    }
    return query(LEGACY_OUTBOX_TABLE);
  }
  return result;
}

/** Test-only: start the next query from the new table name again. */
export function resetOutboxTableForTests(): void {
  outboxTableName = OUTBOX_TABLE;
}

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
  const { data, error } = await withOutboxTable((table) =>
    admin
      .from(table)
      .insert({
        quote_request_id: quoteRequestId,
        idempotency_key: idempotencyKey,
        envelope,
        status: "pending",
      })
      .select("id")
      .single(),
  );
  if (error) {
    console.error("[outbox] insert failed:", error.message);
    return null;
  }
  return (data as { id: string }).id;
}

/**
 * Same as insertOutbox but for a PAID ORDER envelope (order_id, not
 * quote_request_id). idempotencyKey = the order id — the replay dedupe key.
 */
export async function insertOrderOutbox(
  orderId: string,
  idempotencyKey: string,
  envelope: LeadEnvelope,
): Promise<string | null> {
  const admin = supabaseAdmin();
  const { data, error } = await withOutboxTable((table) =>
    admin
      .from(table)
      .insert({ order_id: orderId, idempotency_key: idempotencyKey, envelope, status: "pending" })
      .select("id")
      .single(),
  );
  if (error) {
    console.error("[outbox] order insert failed:", error.message);
    return null;
  }
  return (data as { id: string }).id;
}

export async function markOutbox(id: string, result: ForwardResult): Promise<void> {
  const admin = supabaseAdmin();
  const { error } = await withOutboxTable((table) =>
    admin
      .from(table)
      .update({
        status: result.outcome,
        attempts: result.attempts,
        last_error: result.error ?? null,
        response_status: result.status ?? null,
        sent_at: result.outcome === "sent" ? new Date().toISOString() : null,
      })
      .eq("id", id),
  );
  if (error) console.error("[outbox] mark failed:", error.message);
}

/**
 * Forward a persisted outbox row and record the outcome. Best-effort: with the
 * gate off it resolves to `skipped_gated` and makes no call; with the gate on and
 * the intake killed mid-flight it resolves to `failed` and marks the row — never
 * throwing, never affecting the visitor's already-returned success.
 */
export async function forwardAndMark(outboxId: string, envelope: LeadEnvelope): Promise<void> {
  const result = await forwardToEverdoer(envelope);
  await markOutbox(outboxId, result);
}

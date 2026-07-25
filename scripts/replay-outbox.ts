/**
 * Replay EmpireVu outbox rows by status.
 *
 *   bun scripts/replay-outbox.ts skipped_gated   # after flipping the gate on
 *   bun scripts/replay-outbox.ts failed          # retry transient failures
 *
 * Each row is re-signed at send time (signatures are timestamp-bound and not
 * stored) and re-sent through the same gated forwarder, then the row is marked.
 * With the gate off it stays skipped_gated. Diff a batch against the golden
 * fixtures before flipping the gate on for the first time.
 */
import type { LeadEnvelope } from "../src/server/empirevu";
import { forwardAndMark } from "../src/server/outbox";
import { supabaseAdmin } from "../src/server/supabase";

async function main() {
  const status = process.argv[2] ?? "failed";
  const limit = Number(process.argv[3] ?? "500");
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("empirevu_outbox")
    .select("id, envelope")
    .eq("status", status)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("query failed:", error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as Array<{ id: string; envelope: LeadEnvelope }>;
  console.log(`Replaying ${rows.length} outbox row(s) with status="${status}"...`);
  for (const row of rows) {
    await forwardAndMark(row.id, row.envelope);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

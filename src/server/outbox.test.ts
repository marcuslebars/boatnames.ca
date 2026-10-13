import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LeadEnvelope } from "./everdoer";

// A tiny stand-in for the supabase-js query builder: records which table each
// call hits and answers from `tables` (a missing table answers like PostgREST).
const calls: Array<{ table: string; op: string; payload?: unknown }> = [];
let existing = new Set<string>();

function missing(table: string) {
  return {
    data: null,
    error: {
      code: "PGRST205",
      message: `Could not find the table 'public.${table}' in the schema cache`,
    },
  };
}

function builder(table: string) {
  const result = () =>
    existing.has(table) ? { data: { id: `row-in-${table}` }, error: null } : missing(table);
  const chain = {
    insert(payload: unknown) {
      calls.push({ table, op: "insert", payload });
      return chain;
    },
    update(payload: unknown) {
      calls.push({ table, op: "update", payload });
      return chain;
    },
    select: () => chain,
    eq: () => chain,
    single: () => chain,
    then<T>(resolve: (v: ReturnType<typeof result>) => T) {
      return Promise.resolve(result()).then(resolve);
    },
  };
  return chain;
}

vi.mock("./supabase", () => ({
  supabaseAdmin: () => ({ from: (table: string) => builder(table) }),
}));

const { insertOutbox, insertOrderOutbox, markOutbox, resetOutboxTableForTests } =
  await import("./outbox");

const envelope = { schemaVersion: 1 } as LeadEnvelope;
const WARNING =
  "[everdoer] everdoer_outbox missing; using legacy empirevu_outbox until migration 20261013000000 is applied";

// Rebrand shim (remove once migration 20261013000000 is applied everywhere)
describe("outbox table name: everdoer_outbox, with a pre-migration fallback", () => {
  beforeEach(() => {
    calls.length = 0;
    resetOutboxTableForTests();
  });
  afterEach(() => vi.restoreAllMocks());

  it("uses everdoer_outbox when it exists (migration applied), no warning", async () => {
    existing = new Set(["everdoer_outbox", "empirevu_outbox"]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await insertOutbox("q1", "q1", envelope)).toBe("row-in-everdoer_outbox");
    expect(await insertOrderOutbox("o1", "o1", envelope)).toBe("row-in-everdoer_outbox");
    await markOutbox("x", { outcome: "skipped_gated", attempts: 0 });
    expect(calls.map((c) => c.table)).toEqual([
      "everdoer_outbox",
      "everdoer_outbox",
      "everdoer_outbox",
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("falls back to empirevu_outbox when the new table is missing, and still writes", async () => {
    existing = new Set(["empirevu_outbox"]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await insertOutbox("q1", "q1", envelope)).toBe("row-in-empirevu_outbox");
    // Remembered for the process: later calls go straight to the legacy table.
    expect(await insertOrderOutbox("o1", "o1", envelope)).toBe("row-in-empirevu_outbox");
    await markOutbox("x", { outcome: "skipped_gated", attempts: 0 });
    expect(calls.map((c) => `${c.op}:${c.table}`)).toEqual([
      "insert:everdoer_outbox",
      "insert:empirevu_outbox",
      "insert:empirevu_outbox",
      "update:empirevu_outbox",
    ]);
    expect(calls[1].payload).toMatchObject({ quote_request_id: "q1", idempotency_key: "q1" });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(WARNING);
  });

  it("also falls back on a raw Postgres undefined_table (42P01)", async () => {
    existing = new Set(["empirevu_outbox"]);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { withOutboxTable } = await import("./outbox");
    const seen: string[] = [];
    const res = await withOutboxTable(async (table) => {
      seen.push(table);
      return table === "everdoer_outbox"
        ? { error: { code: "42P01", message: 'relation "everdoer_outbox" does not exist' } }
        : { error: null };
    });
    expect(seen).toEqual(["everdoer_outbox", "empirevu_outbox"]);
    expect(res.error).toBeNull();
  });

  it("does not fall back on other errors", async () => {
    const { withOutboxTable } = await import("./outbox");
    const seen: string[] = [];
    const res = await withOutboxTable(async (table) => {
      seen.push(table);
      return { error: { code: "23505", message: "duplicate key" } };
    });
    expect(seen).toEqual(["everdoer_outbox"]);
    expect(res.error?.code).toBe("23505");
  });
});

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildHolyShipEnvelope,
  forwardToEmpireVu,
  signEmpireVuBody,
  type LeadEnvelope,
} from "./empirevu";
import { leadEnvelopeSchema } from "./lead-envelope-schema";
import { SAMPLE_HOLYSHIP_LEAD, SAMPLE_RECEIVED_AT } from "./__fixtures__/holyship-sample";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  JSON.parse(readFileSync(join(here, "__fixtures__", "lead-envelopes", name), "utf8"));

describe("buildHolyShipEnvelope matches the golden fixture (drift guard)", () => {
  it("quote -> canonical envelope", () => {
    expect(buildHolyShipEnvelope(SAMPLE_HOLYSHIP_LEAD, SAMPLE_RECEIVED_AT)).toEqual(
      fixture("holyship-quote.json"),
    );
  });

  it("survives the canonical schema WITHOUT losing keys (nothing silently stripped)", () => {
    const env = buildHolyShipEnvelope(SAMPLE_HOLYSHIP_LEAD, SAMPLE_RECEIVED_AT);
    // A plain z.object strips unknowns; if the builder ever emitted a field the
    // schema doesn't know, the intake would store a hollow lead. Round-trip
    // equality proves every field the builder emits has a home in the contract.
    expect(leadEnvelopeSchema.parse(env)).toEqual(env);
  });
});

describe("the canonical + Holy Ship fixtures are all schema-valid", () => {
  for (const name of [
    "holyship-quote.json",
    "care-contact.json",
    "care-booking.json",
    "storage-quote.json",
    "storage-contact-phone-only.json",
  ]) {
    it(name, () => {
      expect(leadEnvelopeSchema.safeParse(fixture(name)).success).toBe(true);
    });
  }
});

describe("forwardToEmpireVu is gated, additive, best-effort (mirrors the siblings)", () => {
  const envelope: LeadEnvelope = buildHolyShipEnvelope(SAMPLE_HOLYSHIP_LEAD, SAMPLE_RECEIVED_AT);
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.EMPIREVU_INTAKE_URL;
    delete process.env.EMPIREVU_INTAKE_SECRET;
    delete process.env.EMPIREVU_INTAKE_DISABLED;
  });

  it("skips (no call) when unconfigured", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as never;
    const res = await forwardToEmpireVu(envelope);
    expect(spy).not.toHaveBeenCalled();
    expect(res.outcome).toBe("skipped_gated");
  });

  it("skips (no call) when disabled by the kill switch", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    process.env.EMPIREVU_INTAKE_DISABLED = "1";
    const spy = vi.fn();
    globalThis.fetch = spy as never;
    const res = await forwardToEmpireVu(envelope);
    expect(spy).not.toHaveBeenCalled();
    expect(res.outcome).toBe("skipped_gated");
  });

  it("signs + posts the exact bytes when configured", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    const spy = vi.fn((_url: string, _opts: RequestInit) =>
      Promise.resolve({ ok: true, status: 200 } as Response),
    );
    globalThis.fetch = spy as never;
    const res = await forwardToEmpireVu(envelope);
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe("https://hub.example/api/intake");
    expect((opts.headers as Record<string, string>)["x-empirevu-signature"]).toBe(
      signEmpireVuBody(opts.body as string, "s"),
    );
    expect(res.outcome).toBe("sent");
  });

  it("never throws when the endpoint fails, and reports failed", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as never;
    const res = await forwardToEmpireVu(envelope, 1);
    expect(res.outcome).toBe("failed");
  });
});

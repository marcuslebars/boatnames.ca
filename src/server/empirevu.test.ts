import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildBoatnamesEnvelope,
  forwardToEmpireVu,
  signEmpireVuBody,
  type BoatnamesLead,
  type LeadEnvelope,
} from "./empirevu";
import { leadEnvelopeSchema } from "./lead-envelope-schema";
import {
  SAMPLE_SHIP_ACRYLIC,
  SAMPLE_INSTALL_VINYL,
  SAMPLE_RECEIVED_AT,
} from "./__fixtures__/boatnames-sample";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  JSON.parse(readFileSync(join(here, "__fixtures__", "lead-envelopes", name), "utf8"));

describe("buildBoatnamesEnvelope matches the golden fixtures (drift guard)", () => {
  it("ship + acrylic -> canonical envelope", () => {
    expect(buildBoatnamesEnvelope(SAMPLE_SHIP_ACRYLIC, SAMPLE_RECEIVED_AT)).toEqual(
      fixture("boatnames-ship-acrylic.json"),
    );
  });

  it("install + vinyl -> canonical envelope", () => {
    expect(buildBoatnamesEnvelope(SAMPLE_INSTALL_VINYL, SAMPLE_RECEIVED_AT)).toEqual(
      fixture("boatnames-install-vinyl.json"),
    );
  });

  it("ignores order-domain fields — they never leak into the lead envelope", () => {
    // Phase 8 guard: a future order flow must not be able to push order-domain
    // data into the lead envelope. The builder reads only known lead fields, so
    // extra keys are dropped entirely and the output is byte-identical.
    const withOrderJunk = {
      ...SAMPLE_SHIP_ACRYLIC,
      orderId: "ord_abc123",
      status: "invoiced",
      subtotalCents: 12345,
      paymentProvider: "stripe",
      externalPaymentRef: "pi_test_ref",
    } as BoatnamesLead;
    const env = buildBoatnamesEnvelope(withOrderJunk, SAMPLE_RECEIVED_AT);
    expect(env).toEqual(buildBoatnamesEnvelope(SAMPLE_SHIP_ACRYLIC, SAMPLE_RECEIVED_AT));
    expect(leadEnvelopeSchema.parse(env)).toEqual(env);
    const serialized = JSON.stringify(env);
    for (const leaked of ["ord_abc123", "subtotal", "paymentProvider", "pi_test_ref", "stripe"]) {
      expect(serialized).not.toContain(leaked);
    }
  });

  it("survives the canonical schema WITHOUT losing keys (nothing silently stripped)", () => {
    // A plain z.object strips unknowns; if the builder ever emitted a field the
    // schema doesn't know, the intake would store a hollow lead. Round-trip
    // equality proves every field the builder emits has a home in the contract.
    for (const lead of [SAMPLE_SHIP_ACRYLIC, SAMPLE_INSTALL_VINYL]) {
      const env = buildBoatnamesEnvelope(lead, SAMPLE_RECEIVED_AT);
      expect(leadEnvelopeSchema.parse(env)).toEqual(env);
    }
  });
});

describe("the canonical + boatnames fixtures are all schema-valid", () => {
  for (const name of [
    "boatnames-ship-acrylic.json",
    "boatnames-install-vinyl.json",
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
  const envelope: LeadEnvelope = buildBoatnamesEnvelope(SAMPLE_SHIP_ACRYLIC, SAMPLE_RECEIVED_AT);
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

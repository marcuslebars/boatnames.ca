import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { assertCheckoutEnv } from "./env";

// Vars the checkout-seam validation reads. Snapshot + clear before each test so
// the ambient process.env can't leak in, then restore after.
const KEYS = [
  "CHECKOUT_ENABLED",
  "PAYMENT_PROVIDER",
  "ADMIN_API_TOKEN",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SHOPIFY_SHOP_DOMAIN",
  "SHOPIFY_ADMIN_ACCESS_TOKEN",
  "SHOPIFY_WEBHOOK_SECRET",
];

describe("assertCheckoutEnv — conditional on CHECKOUT_ENABLED", () => {
  const snapshot: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of KEYS) {
      snapshot[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    }
  });

  it("switch off: tolerates every checkout var being absent", () => {
    expect(() => assertCheckoutEnv()).not.toThrow();
  });

  it("switch off explicitly (=0): still inert", () => {
    process.env.CHECKOUT_ENABLED = "0";
    expect(() => assertCheckoutEnv()).not.toThrow();
  });

  it("on: requires ADMIN_API_TOKEN, naming it", () => {
    process.env.CHECKOUT_ENABLED = "1";
    expect(() => assertCheckoutEnv()).toThrow(/ADMIN_API_TOKEN/);
  });

  it("on + provider none + token set: passes", () => {
    process.env.CHECKOUT_ENABLED = "1";
    process.env.ADMIN_API_TOKEN = "tok";
    expect(() => assertCheckoutEnv()).not.toThrow();
  });

  it("on + stripe: requires both Stripe secrets, naming them", () => {
    process.env.CHECKOUT_ENABLED = "1";
    process.env.ADMIN_API_TOKEN = "tok";
    process.env.PAYMENT_PROVIDER = "stripe";
    expect(() => assertCheckoutEnv()).toThrow(/STRIPE_SECRET_KEY/);
    expect(() => assertCheckoutEnv()).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });

  it("on + stripe + all secrets: passes", () => {
    process.env.CHECKOUT_ENABLED = "1";
    process.env.ADMIN_API_TOKEN = "tok";
    process.env.PAYMENT_PROVIDER = "stripe";
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec";
    expect(() => assertCheckoutEnv()).not.toThrow();
  });

  it("on + shopify: requires the Shopify vars", () => {
    process.env.CHECKOUT_ENABLED = "1";
    process.env.ADMIN_API_TOKEN = "tok";
    process.env.PAYMENT_PROVIDER = "shopify";
    expect(() => assertCheckoutEnv()).toThrow(/SHOPIFY_/);
  });
});

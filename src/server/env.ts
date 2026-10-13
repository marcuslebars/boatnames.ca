/**
 * Server-only environment access + fail-fast validation.
 *
 * NONE of these carry the VITE_ prefix, so Vite never inlines them into the
 * browser bundle. Import this only from server code (routes/api, src/server/*).
 * The database URL, service-role key, Resend key, and Everdoer secret are secrets
 * and must never gain a VITE_ prefix.
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required server env var: ${name}`);
  return v;
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

// Rebrand shim (remove after one release once EVERDOER_* is set)
// Legacy names already warned about in this process, so each warns exactly once.
const warnedLegacyEnv = new Set<string>();

/**
 * Read `name` (an EVERDOER_* var); if it is unset or empty, fall back to the
 * pre-rebrand `legacyName` (EMPIREVU_*) and log a single warning per process.
 * Rebrand shim (remove after one release once EVERDOER_* is set)
 */
export function envWithLegacyFallback(name: string, legacyName: string): string | undefined {
  const v = optional(name);
  if (v !== undefined) return v;
  const legacy = optional(legacyName);
  if (legacy !== undefined && !warnedLegacyEnv.has(legacyName)) {
    warnedLegacyEnv.add(legacyName);
    console.warn(`[everdoer] using legacy env ${legacyName}; set ${name}`);
  }
  return legacy;
}

/** Test-only: forget which legacy vars have warned, so each test starts clean. */
export function resetLegacyEnvWarningsForTests(): void {
  warnedLegacyEnv.clear();
}

export const serverEnv = {
  // Supabase (server-only; service role bypasses RLS)
  supabaseUrl: () => required("SUPABASE_URL"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  storageBucket: () => optional("QUOTE_PHOTO_BUCKET") ?? "quote-photos",

  // Resend notification
  resendApiKey: () => optional("RESEND_API_KEY"),
  leadFromEmail: () => optional("LEAD_FROM_EMAIL") ?? "leads@a1marinecare.ca",
  leadNotifyEmail: () => optional("LEAD_NOTIFY_EMAIL") ?? "hello@a1marinecare.ca",
  // Order emails: `from` on customer-facing order mail, and the A1 inbox that
  // gets new-order notifications (Phase 5). Resend must verify the from-domain.
  orderFromEmail: () => optional("ORDER_FROM_EMAIL") ?? "orders@boatnames.ca",
  orderNotifyEmail: () => optional("ORDER_NOTIFY_EMAIL") ?? "hello@boatnames.ca",

  // Everdoer forward (gated OFF by default in this repo). Each reads EVERDOER_*
  // first, then the legacy name. Rebrand shim (remove after one release once EVERDOER_* is set)
  everdoerIntakeUrl: () => envWithLegacyFallback("EVERDOER_INTAKE_URL", "EMPIREVU_INTAKE_URL"),
  everdoerIntakeSecret: () =>
    envWithLegacyFallback("EVERDOER_INTAKE_SECRET", "EMPIREVU_INTAKE_SECRET"),
  everdoerDisabled: () =>
    envWithLegacyFallback("EVERDOER_INTAKE_DISABLED", "EMPIREVU_INTAKE_DISABLED") === "1",

  // Checkout seam (Phase 8) — server-only, inert unless CHECKOUT_ENABLED=1.
  // Which adapter resolves order amounts ("manual" = always unpriced; "engine" =
  // a1-pricing-engine stub). Default manual.
  pricingAdapter: () => optional("PRICING_ADAPTER") ?? "manual",
  checkoutEnabled: () => process.env.CHECKOUT_ENABLED === "1",
  paymentProvider: () => optional("PAYMENT_PROVIDER") ?? "none",
  adminApiToken: () => optional("ADMIN_API_TOKEN"),
  // Stripe (server-only). Validated by assertCheckoutEnv when CHECKOUT_ENABLED=1
  // and PAYMENT_PROVIDER=stripe. Test keys first; the live-key swap is the owner's.
  stripeSecretKey: () => optional("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => optional("STRIPE_WEBHOOK_SECRET"),

  // Public site origin (also available client-side as VITE_SITE_URL)
  siteUrl: () => optional("SITE_URL") ?? optional("VITE_SITE_URL") ?? "https://boatnames.ca",

  buildSha: () => optional("RAILWAY_GIT_COMMIT_SHA") ?? optional("BUILD_SHA") ?? "dev",
};

/**
 * Hard-required vars for the backend to function. Call at boot (or first request)
 * so a misconfigured deploy fails with a clear message instead of a vague 500.
 */
/**
 * Checkout-seam conditional validation (Phase 8). Inert while CHECKOUT_ENABLED is
 * off (default) — every var may be absent. The moment it is on, the required set
 * for the chosen provider must be present or this throws, naming the missing vars.
 * Wired into assertServerEnv so the existing first-request boot check enforces it.
 */
export function assertCheckoutEnv(): void {
  if (!serverEnv.checkoutEnabled()) return;
  const missing: string[] = [];
  if (!serverEnv.adminApiToken()) missing.push("ADMIN_API_TOKEN");
  const provider = serverEnv.paymentProvider();
  if (provider === "stripe") {
    if (!optional("STRIPE_SECRET_KEY")) missing.push("STRIPE_SECRET_KEY");
    if (!optional("STRIPE_WEBHOOK_SECRET")) missing.push("STRIPE_WEBHOOK_SECRET");
  } else if (provider === "shopify") {
    if (!optional("SHOPIFY_SHOP_DOMAIN")) missing.push("SHOPIFY_SHOP_DOMAIN");
    if (!optional("SHOPIFY_ADMIN_ACCESS_TOKEN")) missing.push("SHOPIFY_ADMIN_ACCESS_TOKEN");
    if (!optional("SHOPIFY_WEBHOOK_SECRET")) missing.push("SHOPIFY_WEBHOOK_SECRET");
  }
  if (missing.length > 0) {
    throw new Error(`CHECKOUT_ENABLED=1 but missing required server env: ${missing.join(", ")}`);
  }
}

export function assertServerEnv(): void {
  required("SUPABASE_URL");
  required("SUPABASE_SERVICE_ROLE_KEY");
  assertCheckoutEnv();
}

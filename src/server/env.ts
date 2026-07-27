/**
 * Server-only environment access + fail-fast validation.
 *
 * NONE of these carry the VITE_ prefix, so Vite never inlines them into the
 * browser bundle. Import this only from server code (routes/api, src/server/*).
 * The database URL, service-role key, Resend key, and EmpireVu secret are secrets
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

export const serverEnv = {
  // Supabase (server-only; service role bypasses RLS)
  supabaseUrl: () => required("SUPABASE_URL"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  storageBucket: () => optional("QUOTE_PHOTO_BUCKET") ?? "quote-photos",

  // Resend notification
  resendApiKey: () => optional("RESEND_API_KEY"),
  leadFromEmail: () => optional("LEAD_FROM_EMAIL") ?? "leads@a1marinecare.ca",
  leadNotifyEmail: () => optional("LEAD_NOTIFY_EMAIL") ?? "hello@a1marinecare.ca",

  // EmpireVu forward (gated OFF by default in this repo)
  empirevuIntakeUrl: () => optional("EMPIREVU_INTAKE_URL"),
  empirevuIntakeSecret: () => optional("EMPIREVU_INTAKE_SECRET"),
  empirevuDisabled: () => process.env.EMPIREVU_INTAKE_DISABLED === "1",

  // Checkout seam (Phase 8) — server-only, inert unless CHECKOUT_ENABLED=1.
  // Which adapter resolves order amounts ("manual" = always unpriced; "engine" =
  // a1-pricing-engine stub). Default manual.
  pricingAdapter: () => optional("PRICING_ADAPTER") ?? "manual",
  checkoutEnabled: () => process.env.CHECKOUT_ENABLED === "1",
  paymentProvider: () => optional("PAYMENT_PROVIDER") ?? "none",
  adminApiToken: () => optional("ADMIN_API_TOKEN"),

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

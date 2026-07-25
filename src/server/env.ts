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

  // Public site origin (also available client-side as VITE_SITE_URL)
  siteUrl: () =>
    optional("SITE_URL") ?? optional("VITE_SITE_URL") ?? "https://holyship.a1marinecare.ca",

  buildSha: () => optional("RAILWAY_GIT_COMMIT_SHA") ?? optional("BUILD_SHA") ?? "dev",
};

/**
 * Hard-required vars for the backend to function. Call at boot (or first request)
 * so a misconfigured deploy fails with a clear message instead of a vague 500.
 */
export function assertServerEnv(): void {
  required("SUPABASE_URL");
  required("SUPABASE_SERVICE_ROLE_KEY");
}

import { supabaseAdmin } from "./supabase";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 5;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Postgres-backed IP rate limit (5 / hour). Counts rows in the trailing window
 * and, when allowed, records this attempt. Backed by a table (not memory) so it
 * holds across cold starts and multiple instances. Fails OPEN (allows) if the
 * counting query errors — a rate-limit outage must not drop real leads.
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const admin = supabaseAdmin();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count, error } = await admin
    .from("quote_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);

  if (error) {
    console.error("[rate-limit] count failed, allowing:", error.message);
    return { allowed: true, remaining: MAX_PER_WINDOW };
  }

  const used = count ?? 0;
  if (used >= MAX_PER_WINDOW) return { allowed: false, remaining: 0 };

  const { error: insErr } = await admin.from("quote_rate_limits").insert({ ip });
  if (insErr) console.error("[rate-limit] record failed:", insErr.message);

  return { allowed: true, remaining: Math.max(0, MAX_PER_WINDOW - used - 1) };
}

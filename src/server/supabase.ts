import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { serverEnv } from "./env";

let cached: SupabaseClient | null = null;

/**
 * Service-role Supabase client — RLS-bypassing, SERVER-ONLY. This is the single
 * sanctioned writer for the quote backend (mirrors the A1 stack's "service role
 * confined to one path" rule). Never import this from client code.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!cached) {
    cached = createClient(serverEnv.supabaseUrl(), serverEnv.supabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cached;
}

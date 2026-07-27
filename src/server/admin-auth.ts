import { timingSafeEqual } from "node:crypto";

import { serverEnv } from "./env";

export type AdminAuthResult = { ok: true } | { ok: false; status: 404 | 403; error: string };

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  // Length differs -> not equal; timingSafeEqual requires equal-length buffers.
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Gate an admin order endpoint (Phase 8). SERVER-TO-SERVER only.
 *
 * - Checkout seam off  -> 404 (the feature does not exist for the public).
 * - Token env unset    -> 403 (reject even when CHECKOUT_ENABLED=1).
 * - Bearer missing/wrong -> 403 (constant-time compare).
 *
 * These responses carry NO `Access-Control-Allow-Origin`, and the routes define
 * no OPTIONS handler, so a cross-origin browser call is blocked by the browser
 * (preflight fails / response unreadable). curl and server-to-server callers
 * (EmpireVu) are unaffected.
 */
export function authorizeAdmin(request: Request): AdminAuthResult {
  if (!serverEnv.checkoutEnabled()) return { ok: false, status: 404, error: "Not found." };
  const token = serverEnv.adminApiToken();
  if (!token) return { ok: false, status: 403, error: "Admin API not configured." };
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!bearer || !safeEqual(bearer, token)) return { ok: false, status: 403, error: "Forbidden." };
  return { ok: true };
}

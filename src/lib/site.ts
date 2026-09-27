const DEFAULT_SITE_URL = "https://boatnames.ca";

/**
 * Normalize a configured site origin. An unset OR empty value falls back to the
 * default: the Dockerfile declares `ARG VITE_SITE_URL` + `ENV VITE_SITE_URL=$VITE_SITE_URL`,
 * so when the platform passes no build arg the variable is inlined as "" — and a
 * `??` fallback would keep that empty string, emitting relative canonicals, og:image
 * and sitemap <loc>s. Any trailing slash is trimmed so `${SITE_URL}/path` is well-formed.
 */
export function resolveSiteUrl(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : DEFAULT_SITE_URL;
}

// Canonical public origin for the site — used for absolute URLs in <head>
// metadata, JSON-LD, and the sitemap. Override with VITE_SITE_URL (public; safe
// to ship to the browser).
export const SITE_URL = resolveSiteUrl(import.meta.env.VITE_SITE_URL as string | undefined);

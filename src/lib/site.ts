// Canonical public origin for the site — used for absolute URLs in <head>
// metadata, JSON-LD, and the sitemap. Override with VITE_SITE_URL (public; safe
// to ship to the browser). Any trailing slash is trimmed so `${SITE_URL}/path`
// is always well-formed.
export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined) ?? "https://boatnames.ca"
).replace(/\/+$/, "");

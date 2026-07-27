import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { SITE_URL } from "@/lib/site";

// Computed once when the server module loads (≈ deploy time) so <lastmod> stays
// stable across requests instead of always reporting the current date.
const LASTMOD = new Date().toISOString().slice(0, 10);

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const routes: Array<{ path: string; changefreq: string; priority: string }> = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/install", changefreq: "monthly", priority: "0.8" },
          { path: "/gallery/holy-ship", changefreq: "yearly", priority: "0.6" },
          { path: "/names", changefreq: "monthly", priority: "0.5" },
        ];
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...routes.map(
            (r) =>
              `  <url><loc>${SITE_URL}${r.path}</loc><lastmod>${LASTMOD}</lastmod><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`,
          ),
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

import { assertServerEnv } from "@/server/env";
import { sniffImageType, type SniffedImageType } from "@/server/magic-bytes";
import { handleQuoteSubmission } from "@/server/quote-intake";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export const Route = createFileRoute("/api/quote")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          assertServerEnv();
        } catch (err) {
          console.error("[api/quote]", err);
          return json({ ok: false, error: "Backend not configured." }, 503);
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return json({ ok: false, error: "Expected multipart form data." }, 400);
        }

        const fields: Record<string, string> = {};
        let photo: { bytes: Uint8Array; type: SniffedImageType } | null = null;

        for (const [key, value] of form.entries()) {
          if (typeof value === "string") {
            fields[key] = value;
            continue;
          }
          // A File entry. Only the photo field is accepted.
          if (key === "photo" && value.size > 0) {
            if (value.size > MAX_PHOTO_BYTES) {
              return json({ ok: false, error: "Photo must be 10 MB or smaller." }, 400);
            }
            const bytes = new Uint8Array(await value.arrayBuffer());
            // Sniff magic bytes — never trust the declared MIME type or filename.
            const type = sniffImageType(bytes);
            if (!type) {
              return json(
                { ok: false, error: "Photo must be a JPG, PNG, WEBP or HEIC image." },
                400,
              );
            }
            photo = { bytes, type };
          }
        }

        try {
          const outcome = await handleQuoteSubmission({
            fields,
            photo,
            ip: clientIp(request),
            userAgent: request.headers.get("user-agent"),
            referrer: request.headers.get("referer"),
          });
          return json(outcome.body, outcome.status);
        } catch (err) {
          console.error("[api/quote] unhandled:", err);
          return json({ ok: false, error: "Something went wrong. Please try again." }, 500);
        }
      },
    },
  },
});

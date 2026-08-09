import { createFileRoute } from "@tanstack/react-router";

import { approveProof } from "@/server/checkout";

/**
 * Customer proof-approval link target (from the proof email). Verifies the signed
 * token, flips paid -> proofed, and shows a small branded confirmation page.
 * GET (it's a link click); idempotent (a second click says "already approved").
 */
function page(title: string, message: string, ok: boolean, status: number): Response {
  const accent = ok ? "#C9A227" : "#8C969B";
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · boatnames.ca</title></head>
<body style="margin:0;background:#141A20;color:#f2f4f3;font-family:Arial,Helvetica,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center">
  <div style="max-width:440px;padding:40px 24px;text-align:center">
    <div style="font-size:22px;font-weight:bold">boatnames<span style="color:#C9A227">.ca</span></div>
    <p style="font-size:11px;letter-spacing:3px;color:${accent};margin-top:20px">${ok ? "APPROVED" : "HEADS UP"}</p>
    <h1 style="font-size:24px;margin:10px 0 12px">${title}</h1>
    <p style="color:#8C969B;line-height:1.5">${message}</p>
    <a href="https://boatnames.ca" style="display:inline-block;margin-top:24px;color:#C9A227;text-decoration:none;font-size:13px;letter-spacing:2px">← BOATNAMES.CA</a>
  </div>
</body></html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    },
  );
}

export const Route = createFileRoute("/api/orders/approve")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const orderId = url.searchParams.get("order") ?? "";
        const token = url.searchParams.get("token") ?? "";
        const result = await approveProof(orderId, token);
        return page(
          result.ok ? "Proof approved" : "Couldn't approve this",
          result.message,
          result.ok,
          result.status,
        );
      },
    },
  },
});

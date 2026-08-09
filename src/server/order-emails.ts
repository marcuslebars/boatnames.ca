/**
 * Customer order emails — plain, branded, no marketing fluff. Pure builders that
 * return { subject, html, text }; the caller sends them via email.sendEmail.
 * The header is a light wordmark lockup rendered as text (SVG/PNG logos are
 * unreliable in email clients).
 */
const GOLD = "#C9A227";

function money(cents: number | null | undefined, currency = "CAD"): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)} ${currency}`;
}

function shell(bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f2f4f3;font-family:Arial,Helvetica,sans-serif;color:#141A20;line-height:1.5">
  <div style="max-width:540px;margin:0 auto;padding:32px 24px">
    <div style="font-size:22px;font-weight:bold;letter-spacing:-0.5px">boatnames<span style="color:${GOLD}">.ca</span></div>
    <div style="font-size:10px;letter-spacing:3px;color:#8C969B;margin-top:3px">AN A1 COMPANY</div>
    <div style="height:1px;background:#e2e5e4;margin:20px 0"></div>
    ${bodyHtml}
    <div style="height:1px;background:#e2e5e4;margin:24px 0"></div>
    <div style="font-size:11px;color:#8C969B">boatnames.ca · custom boat name lettering · prices in CAD</div>
  </div></body></html>`;
}

function designLine(d: {
  boatName?: string;
  productLine?: string;
  finish?: string;
  letterHeightIn?: number;
}): string {
  return [
    d.boatName ? `"${d.boatName}"` : null,
    d.productLine === "acrylic" ? "cast acrylic" : d.productLine === "vinyl" ? "cut vinyl" : null,
    d.finish,
    d.letterHeightIn ? `${d.letterHeightIn}" letters` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export interface OrderEmail {
  subject: string;
  html: string;
  text: string;
}

/** On `paid`. States the sequence plainly; no proof/approval link yet. */
export function orderConfirmationEmail(o: {
  name?: string;
  boatName?: string;
  productLine?: string;
  finish?: string;
  letterHeightIn?: number;
  totalCents?: number | null;
  currency?: string;
}): OrderEmail {
  const summary = designLine(o);
  const total = money(o.totalCents, o.currency);
  const subject = `Payment received — your boatnames.ca order`;
  const html = shell(`
    <p style="font-size:12px;letter-spacing:2px;color:${GOLD};margin:0 0 8px">PAYMENT RECEIVED</p>
    <h1 style="font-size:20px;margin:0 0 12px">Thanks${o.name ? `, ${o.name}` : ""} — we've got your order.</h1>
    <p>Here's what happens next, in order:</p>
    <ol style="padding-left:18px;margin:8px 0 16px">
      <li><strong>Payment received</strong> (${total}, incl. tax).</li>
      <li><strong>We send you a proof within one business day</strong> to approve.</li>
      <li><strong>Production starts the moment you approve it</strong> — custom-cut work only begins on your OK.</li>
    </ol>
    <p style="font-size:13px;color:#555"><strong>Your design:</strong> ${summary || "—"}</p>
    <p style="font-size:13px;color:#555">Reply to this email any time with questions.</p>`);
  const text = `PAYMENT RECEIVED

Thanks${o.name ? `, ${o.name}` : ""} — we've got your order.

What happens next:
1. Payment received (${total}, incl. tax).
2. We send you a proof within one business day to approve.
3. Production starts the moment you approve it — custom-cut work only begins on your OK.

Your design: ${summary || "—"}

Reply any time with questions.
boatnames.ca — An A1 Company`;
  return { subject, html, text };
}

/** The proof email with the signed approval link. Approving flips paid -> proofed. */
export function proofReadyEmail(
  o: { boatName?: string; productLine?: string; finish?: string; letterHeightIn?: number },
  approveUrl: string,
): OrderEmail {
  const summary = designLine(o);
  const subject = `Your proof is ready — approve to start production`;
  const html = shell(`
    <p style="font-size:12px;letter-spacing:2px;color:${GOLD};margin:0 0 8px">YOUR PROOF IS READY</p>
    <h1 style="font-size:20px;margin:0 0 12px">One click starts production.</h1>
    <p style="font-size:13px;color:#555"><strong>Your design:</strong> ${summary || "—"}</p>
    <p>Review the proof attached to this email. When it's right, approve it — we start cutting immediately. Custom-cut lettering can't be returned once production starts, so this is the point to catch anything.</p>
    <p style="margin:20px 0">
      <a href="${approveUrl}" style="background:${GOLD};color:#141A20;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:4px;display:inline-block">Approve &amp; start production →</a>
    </p>
    <p style="font-size:13px;color:#555">Need a change? Just reply — we'll re-proof, no charge.</p>`);
  const text = `YOUR PROOF IS READY

Your design: ${summary || "—"}

Review the proof, then approve to start production (custom-cut work can't be returned once it starts):
${approveUrl}

Need a change? Reply and we'll re-proof, no charge.
boatnames.ca — An A1 Company`;
  return { subject, html, text };
}

/** On `shipped`, with tracking. */
export function orderShippedEmail(o: {
  boatName?: string;
  carrier?: string;
  tracking?: string;
}): OrderEmail {
  const track = o.tracking ? `${o.carrier ? `${o.carrier} ` : ""}${o.tracking}` : null;
  const subject = `Shipped — your boatnames.ca lettering is on the way`;
  const html = shell(`
    <p style="font-size:12px;letter-spacing:2px;color:${GOLD};margin:0 0 8px">SHIPPED</p>
    <h1 style="font-size:20px;margin:0 0 12px">Your lettering is on the way.</h1>
    ${o.boatName ? `<p style="font-size:13px;color:#555"><strong>"${o.boatName}"</strong> is boxed and shipped.</p>` : ""}
    ${track ? `<p><strong>Tracking:</strong> ${track}</p>` : "<p>Tracking details to follow.</p>"}
    <p style="font-size:13px;color:#555">Your kit includes a step-by-step application guide and a full-size template. Questions on install? Reply any time.</p>`);
  const text = `SHIPPED

Your lettering is on the way.${o.boatName ? ` ("${o.boatName}")` : ""}
${track ? `Tracking: ${track}` : "Tracking details to follow."}

Your kit includes an application guide and a full-size template. Reply with any install questions.
boatnames.ca — An A1 Company`;
  return { subject, html, text };
}

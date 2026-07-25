import { serverEnv } from "./env";

export interface LeadEmailInput {
  subject: string;
  html: string;
  text: string;
}

/**
 * Send the internal lead notification via Resend. No-ops (logs) when
 * RESEND_API_KEY is unset, so a submission never fails for lack of email config —
 * the lead is already durably saved by the time this runs.
 */
export async function sendLeadNotification(input: LeadEmailInput): Promise<void> {
  const key = serverEnv.resendApiKey();
  if (!key) {
    console.log("[email] RESEND_API_KEY not set — skipping notification (lead already saved)");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: serverEnv.leadFromEmail(),
      to: [serverEnv.leadNotifyEmail()],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}

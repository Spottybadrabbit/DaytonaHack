/**
 * Minimal owner notification.
 *
 * - If RESEND_API_KEY + GTM_NOTIFY_EMAIL are set, sends email via Resend.
 * - Else if GTM_NOTIFY_URL is set, POSTs JSON payload.
 * - Otherwise no-op.
 */

export async function notifyLead(lead: Record<string, unknown>): Promise<void> {
  const to = process.env.GTM_NOTIFY_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey && to) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.GTM_NOTIFY_FROM || "agents@agentsinthewild.dev",
        to,
        subject: `New lead: ${lead.name || lead.company || "unknown"}`,
        text: `A GTM agent found a new lead:\n\n${JSON.stringify(lead, null, 2)}`,
      }),
    });
    return;
  }

  const webhook = process.env.GTM_NOTIFY_URL;
  if (webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "gtm.lead", lead }),
    });
  }
}

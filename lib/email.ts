/**
 * Sends a plain email through Resend's HTTP API (no SDK needed).
 * Needs RESEND_API_KEY and EMAIL_FROM (an address on a domain verified in Resend).
 * Without them the message is only logged, so local development works without an email account.
 */
export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.warn(`[email] RESEND_API_KEY/EMAIL_FROM not set; not sent. To: ${to}\n${subject}\n${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

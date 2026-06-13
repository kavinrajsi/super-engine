// Minimal email sender via the Resend REST API (no SDK). Best-effort: no-ops
// (returns false) when RESEND_API_KEY is unset, mirroring the rest of the app's
// optional integrations. `from` needs a Resend-verified domain in production.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY || !to) return false;
  const from = process.env.RESEND_FROM || "MadRank <onboarding@resend.dev>";
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, ...(html ? { html } : {}), ...(text ? { text } : {}) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

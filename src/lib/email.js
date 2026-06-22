// Minimal email sender via the Zoho ZeptoMail REST API (no SDK). Best-effort:
// no-ops (returns false) when not configured, mirroring the app's other optional
// integrations. `from` must be a ZeptoMail-verified sender domain/address.
//
// Env:
//   ZEPTOMAIL_TOKEN     — the "Send Mail Token" (with or without the
//                         "Zoho-enczapikey " prefix).
//   ZEPTOMAIL_FROM      — verified sender email address.
//   ZEPTOMAIL_FROM_NAME — optional display name (default "MadRank").
//   ZEPTOMAIL_API_URL   — optional region override (Zoho has regional DCs);
//                         default https://api.zeptomail.com/v1.1/email
//                         (use api.zeptomail.in / .eu etc. for those regions).

const DEFAULT_ENDPOINT = "https://api.zeptomail.com/v1.1/email";

export function isEmailConfigured() {
  return !!(process.env.ZEPTOMAIL_TOKEN && process.env.ZEPTOMAIL_FROM);
}

// ZeptoMail expects "Zoho-enczapikey <token>"; accept the token with or without it.
function authHeader() {
  const token = process.env.ZEPTOMAIL_TOKEN || "";
  return /^Zoho-enczapikey\s/i.test(token) ? token : `Zoho-enczapikey ${token}`;
}

export async function sendEmail({ to, subject, html, text }) {
  if (!isEmailConfigured() || !to) return false;
  const endpoint = process.env.ZEPTOMAIL_API_URL || DEFAULT_ENDPOINT;
  const recipients = (Array.isArray(to) ? to : [to])
    .filter(Boolean)
    .map((address) => ({ email_address: { address } }));
  if (!recipients.length) return false;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        from: {
          address: process.env.ZEPTOMAIL_FROM,
          name: process.env.ZEPTOMAIL_FROM_NAME || "MadRank",
        },
        to: recipients,
        subject,
        ...(html ? { htmlbody: html } : {}),
        ...(text ? { textbody: text } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** @type {import('next').NextConfig} */

// Conservative CSP. 'unsafe-inline' is required for Next/React inline runtime
// and the next-themes anti-flash script; PostHog + Google + the AI gateway are
// reached over https (covered by connect-src https:). frame-ancestors 'none'
// blocks clickjacking regardless. Tighten with nonces later if desired.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  reactCompiler: true,
  // puppeteer-core is server-only and must not be bundled.
  serverExternalPackages: ["puppeteer-core"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;

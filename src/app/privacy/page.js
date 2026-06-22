// Privacy Policy — public (no auth gate) so Google can crawl it for OAuth
// verification. The Google API Services User Data Policy disclosure below is
// REQUIRED for the sensitive Search Console scope.

import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";

export const metadata = { title: "Privacy Policy — MadRank" };

const UPDATED = "June 22, 2026";
const CONTACT = "kavin@madarth.com";
const CONTACT_ALT = "sikavinraj@gmail.com";

function Shell({ children }) {
  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <Link href="/" className="font-bold tracking-tight no-underline">
          📈 MadRank
        </Link>
        <ThemeToggle />
      </header>
      <div className="mx-auto max-w-3xl space-y-6 p-6">{children}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <Shell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: {UPDATED}</p>
      </div>

      <Section title="Overview">
        <p>
          MadRank (“we”, “us”) is an SEO and AI-search auditing tool. This policy explains what data
          we collect, how we use it, and the choices you have. By using MadRank you agree to this
          policy.
        </p>
      </Section>

      <Section title="Information we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Account data.</strong> When you sign in with Google, we receive your name, email
            address, and profile picture.
          </li>
          <li>
            <strong>Google Search Console &amp; Google Analytics data.</strong> If you connect them,
            we access your Search Console and Analytics 4 metrics (queries, clicks, impressions,
            pages, sessions, etc.) on a <strong>read-only</strong> basis to display your dashboards.
          </li>
          <li>
            <strong>URLs and audit content.</strong> The websites you scan, the resulting audit
            reports, brand “memory” profiles you write, and AI-generated articles and posts.
          </li>
          <li>
            <strong>Provider API keys.</strong> If you bring your own AI provider key, it is stored
            <strong> encrypted at rest</strong> and is never displayed back to you.
          </li>
          <li>
            <strong>Usage analytics.</strong> Product-usage events (e.g. when a scan or generation
            runs) to improve the service.
          </li>
        </ul>
      </Section>

      <Section title="How we use information">
        <p>
          We use your data only to provide and improve MadRank’s features: authenticating you,
          rendering your Search Console / Analytics dashboards, running audits, generating content,
          and remembering your settings and history. We do <strong>not</strong> sell your data or use
          your Google user data for advertising.
        </p>
      </Section>

      <Section title="Google API Services — Limited Use disclosure">
        <p>
          MadRank’s use and transfer of information received from Google APIs to any other app will
          adhere to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. We only request read-only scopes, access your
          Google data solely to provide user-facing features, and do not transfer or use that data
          for serving ads, building AI/ML models, or any unrelated purpose.
        </p>
      </Section>

      <Section title="How data is stored and protected">
        <p>
          Data is stored in a managed PostgreSQL database (Neon). Secrets such as OAuth refresh
          tokens and your AI provider keys are encrypted with AES-256-GCM. Access is restricted to
          the running application.
        </p>
      </Section>

      <Section title="Third-party services">
        <p>We rely on the following processors to operate MadRank:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Google (sign-in, Search Console, Analytics)</li>
          <li>AI providers you choose (OpenAI, Anthropic, Google) and/or the Vercel AI Gateway</li>
          <li>Vercel (hosting), Neon (database)</li>
          <li>DataForSEO and Browserbase (audit data / headless rendering, where applicable)</li>
          <li>PostHog (product analytics), Razorpay (payments for Pro plans)</li>
        </ul>
      </Section>

      <Section title="Your choices and data deletion">
        <p>
          You can disconnect Google Search Console / Analytics at any time from the dashboard, which
          revokes our stored tokens. You may also revoke access from your{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Google Account permissions
          </a>
          . To delete your account and associated data (profiles, scans, generated content, keys),
          contact us at <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a>.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be reflected by the
          “Last updated” date above.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions or data-deletion requests? Email{" "}
          <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a> or{" "}
          <a href={`mailto:${CONTACT_ALT}`} className="underline">{CONTACT_ALT}</a>.
        </p>
      </Section>

      <p className="border-t pt-4 text-sm text-muted-foreground">
        See also our{" "}
        <Link href="/terms" className="underline">
          Terms of Service
        </Link>
        .
      </p>
    </Shell>
  );
}

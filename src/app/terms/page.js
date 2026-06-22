// Terms of Service — public (no auth gate). This is a template, not legal advice.

import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";
import SiteFooter from "@/components/site-footer";

export const metadata = { title: "Terms of Service — MadRank" };

const UPDATED = "June 22, 2026";
const CONTACT = "kavin@madarth.com";
const CONTACT_ALT = "sikavinraj@gmail.com";
const JURISDICTION = "India";

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
      <SiteFooter />
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

export default function TermsPage() {
  return (
    <Shell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: {UPDATED}</p>
      </div>

      <Section title="1. Acceptance">
        <p>
          By accessing or using MadRank (the “Service”) you agree to these Terms of Service. If you
          do not agree, do not use the Service.
        </p>
      </Section>

      <Section title="2. The Service">
        <p>
          MadRank provides SEO and AI-search auditing, Google Search Console / Analytics dashboards,
          and AI-assisted content generation. Features and limits may differ between the Free and Pro
          plans and may change over time.
        </p>
      </Section>

      <Section title="3. Accounts">
        <p>
          You sign in with Google and are responsible for activity under your account and for keeping
          your credentials and any provider API keys you supply secure. You must provide accurate
          information and use the Service only for sites and data you are authorized to access.
        </p>
      </Section>

      <Section title="4. Acceptable use">
        <ul className="list-disc space-y-1 pl-5">
          <li>Do not scan or audit sites you do not own or lack permission to test.</li>
          <li>Do not use the Service to break the law or infringe others’ rights.</li>
          <li>
            Do not attempt to disrupt, reverse-engineer, or abuse the Service or its rate limits.
          </li>
          <li>You are responsible for content you generate and how you use it.</li>
        </ul>
      </Section>

      <Section title="5. AI-generated content">
        <p>
          AI output may be inaccurate or incomplete. You are responsible for reviewing and editing
          generated articles and posts before publishing. When you supply your own AI provider key,
          your use of that provider is also governed by the provider’s terms, and you are responsible
          for any usage charges they bill you.
        </p>
      </Section>

      <Section title="6. Payments">
        <p>
          MadRank is currently free to use — there are no paid plans. If paid plans are introduced in
          the future, the applicable billing terms will be presented before you are charged.
        </p>
      </Section>

      <Section title="7. Third-party services">
        <p>
          The Service integrates third parties (e.g. Google, AI providers, DataForSEO, Vercel, Neon,
          PostHog). We are not responsible for third-party services, and your use of them may be
          subject to their own terms.
        </p>
      </Section>

      <Section title="8. Disclaimers">
        <p>
          The Service is provided “as is” and “as available,” without warranties of any kind. We do
          not guarantee any particular search ranking, traffic, or business outcome.
        </p>
      </Section>

      <Section title="9. Limitation of liability">
        <p>
          To the maximum extent permitted by law, MadRank and its operators are not liable for any
          indirect, incidental, or consequential damages, or for any loss of data, revenue, or
          profits arising from your use of the Service.
        </p>
      </Section>

      <Section title="10. Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate access if you
          violate these Terms or to protect the Service.
        </p>
      </Section>

      <Section title="11. Governing law">
        <p>These Terms are governed by the laws of {JURISDICTION}, without regard to conflict-of-law rules.</p>
      </Section>

      <Section title="12. Changes">
        <p>
          We may update these Terms; material changes are reflected by the “Last updated” date.
          Continued use after changes constitutes acceptance.
        </p>
      </Section>

      <Section title="13. Contact">
        <p>
          Questions? Email{" "}
          <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a> or{" "}
          <a href={`mailto:${CONTACT_ALT}`} className="underline">{CONTACT_ALT}</a>.
        </p>
      </Section>

      <p className="border-t pt-4 text-sm text-muted-foreground">
        See also our{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </Shell>
  );
}

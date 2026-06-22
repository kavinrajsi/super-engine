// Shared site footer — used on every page except login. Mirrors the home page
// footer: brand + quick links to the main surfaces and legal pages.

import Link from "next/link";

const LINKS = [
  { href: "/seo", label: "SEO" },
  { href: "/competitors", label: "Competitors" },
  { href: "/articles", label: "Articles" },
  { href: "/google-updates", label: "Algorithm updates" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-foreground no-underline" aria-label="MadRank home">
          <span
            aria-hidden="true"
            className="grid size-5 place-items-center rounded-[4px] bg-primary font-mono text-[10px] font-bold text-primary-foreground"
          >
            M
          </span>
          <span className="font-display font-bold tracking-tight">MadRank</span>
        </Link>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

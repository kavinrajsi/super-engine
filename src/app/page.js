// Home page: a single URL input that kicks off a scan.
// Plain GET form -> /scan?url=...&deep=... so it works without client JS.

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import ThemeToggle from "@/components/theme-toggle";
import UserMenu from "@/components/user-menu";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <span className="font-bold tracking-tight">🔎 Meta Tag</span>
        <div className="flex items-center gap-4">
          <Link
            href="/history"
            className="text-sm font-medium text-muted-foreground no-underline hover:text-foreground"
          >
            History
          </Link>
          <Link
            href="/search-console"
            className="text-sm font-medium text-muted-foreground no-underline hover:text-foreground"
          >
            Search Console
          </Link>
          <Link
            href="/google-updates"
            className="text-sm font-medium text-muted-foreground no-underline hover:text-foreground"
          >
            Algorithm updates
          </Link>
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <div className="container">
        <div className="hero">
          <h1 className="text-4xl font-bold tracking-tight">
            Audit any website&rsquo;s SEO
          </h1>
          <p className="max-w-xl text-muted-foreground">
            Enter a URL. We read its sitemap, then grade each page&rsquo;s title,
            meta description, Open Graph, Twitter/X card, canonical, AI-search
            readiness, and more.
          </p>

          <Card className="mt-6 w-full max-w-xl">
            <CardContent>
              <form action="/scan" method="get" className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="text"
                    inputMode="url"
                    name="url"
                    placeholder="example.com"
                    required
                    autoComplete="url"
                    aria-label="Website URL"
                    className="h-11 flex-1 text-base"
                  />
                  <Button type="submit" size="lg" className="h-11 px-6 text-base">
                    Run audit
                  </Button>
                </div>
                <Label className="flex items-center justify-center gap-2 font-normal text-muted-foreground">
                  <Checkbox name="deep" value="1" />
                  Also run a deep scan to find pages missing from the sitemap
                </Label>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Free Tools — Meta Tag" };

const TOOLS = [
  {
    href: "/tools/sitemap",
    title: "Sitemap Generator",
    desc: "Crawl a site and generate a ready-to-publish sitemap.xml.",
  },
  {
    href: "/tools/llms",
    title: "llms.txt Generator",
    desc: "Generate an llms.txt to guide AI crawlers — optionally enhanced with AI.",
  },
  {
    href: "/tools/robots",
    title: "robots.txt Generator",
    desc: "Generate a robots.txt that allows crawling and links your sitemap.",
  },
  {
    href: "/tools/ai-txt",
    title: "ai.txt Generator",
    desc: "Set AI crawler / training-data preferences with an ai.txt file.",
  },
];

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Free tools</h1>
        <p className="text-muted-foreground">Generate publish-ready files from any website.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <Card key={t.href}>
            <CardHeader>
              <CardTitle>{t.title}</CardTitle>
              <CardDescription>{t.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={t.href} className={buttonVariants()}>
                Open
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

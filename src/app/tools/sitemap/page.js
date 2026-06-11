import { Suspense } from "react";
import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { runScan } from "@/lib/seo/analyze";
import { generateSitemap } from "@/lib/seo/generate";
import GeneratorView from "@/app/scan/generator-view";
import { Skeleton } from "@/components/ui/skeleton";
import ToolForm from "../tool-form";

export const metadata = { title: "Sitemap Generator — Meta Tag" };

function Err({ msg }) {
  return <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{msg}</p>;
}

async function Result({ raw }) {
  let safe;
  try {
    safe = assertSafeUrl(raw);
  } catch (e) {
    return <Err msg={e.message} />;
  }
  let result;
  try {
    result = await runScan(safe.toString(), { deepScan: true });
  } catch (e) {
    return <Err msg={`Scan failed: ${e.message}`} />;
  }
  if (!result.pages.length) return <Err msg="No pages could be found to include." />;
  return (
    <GeneratorView
      title="Sitemap"
      filename="sitemap.xml"
      mime="application/xml"
      content={generateSitemap(result)}
    />
  );
}

export default async function SitemapTool({ searchParams }) {
  const params = await searchParams;
  const raw = typeof params.url === "string" ? params.url : "";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sitemap Generator</h1>
        <p className="text-muted-foreground">
          Enter a URL to crawl the site and generate a ready-to-publish sitemap.xml.
        </p>
      </div>
      <ToolForm action="/tools/sitemap" defaultValue={raw} />
      {raw && (
        <Suspense key={raw} fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
          <Result raw={raw} />
        </Suspense>
      )}
    </div>
  );
}

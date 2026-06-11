import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { generateRobotsTxt } from "@/lib/seo/generate";
import GeneratorView from "@/app/scan/generator-view";
import ToolForm from "../tool-form";

export const metadata = { title: "robots.txt Generator — Meta Tag" };

export default async function RobotsTool({ searchParams }) {
  const params = await searchParams;
  const raw = typeof params.url === "string" ? params.url : "";
  let content = null;
  let error = null;
  if (raw) {
    try {
      content = generateRobotsTxt({ rootUrl: assertSafeUrl(raw).toString() });
    } catch (e) {
      error = e.message;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">robots.txt Generator</h1>
        <p className="text-muted-foreground">
          Generate a robots.txt that allows crawling and points to your sitemap.
        </p>
      </div>
      <ToolForm action="/tools/robots" defaultValue={raw} />
      {error && <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{error}</p>}
      {content && (
        <GeneratorView title="robots.txt" filename="robots.txt" mime="text/plain" content={content} />
      )}
    </div>
  );
}

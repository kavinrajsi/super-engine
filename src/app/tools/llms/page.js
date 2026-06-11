import { Suspense } from "react";
import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { runScan } from "@/lib/seo/analyze";
import { generateLlms } from "@/lib/seo/generate";
import GeneratorView from "@/app/scan/generator-view";
import { Skeleton } from "@/components/ui/skeleton";
import ToolForm from "../tool-form";

export const metadata = { title: "llms.txt Generator — Meta Tag" };

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
      title="llms.txt"
      filename="llms.txt"
      mime="text/plain"
      content={generateLlms(result)}
      enhanceable
      site={result.rootUrl}
    />
  );
}

export default async function LlmsTool({ searchParams }) {
  const params = await searchParams;
  const raw = typeof params.url === "string" ? params.url : "";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">llms.txt Generator</h1>
        <p className="text-muted-foreground">
          Enter a URL to generate an llms.txt that guides AI crawlers — then optionally
          enhance it with AI.
        </p>
      </div>
      <ToolForm action="/tools/llms" defaultValue={raw} />
      {raw && (
        <Suspense key={raw} fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
          <Result raw={raw} />
        </Suspense>
      )}
    </div>
  );
}

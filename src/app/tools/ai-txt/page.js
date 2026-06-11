import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { generateAiTxt } from "@/lib/seo/generate";
import GeneratorView from "@/app/scan/generator-view";
import ToolForm from "../tool-form";

export const metadata = { title: "ai.txt Generator — Meta Tag" };

export default async function AiTxtTool({ searchParams }) {
  const params = await searchParams;
  const raw = typeof params.url === "string" ? params.url : "";
  let content = null;
  let error = null;
  if (raw) {
    try {
      content = generateAiTxt({ rootUrl: assertSafeUrl(raw).toString() });
    } catch (e) {
      error = e.message;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ai.txt Generator</h1>
        <p className="text-muted-foreground">
          Generate an ai.txt to set AI crawler / training-data preferences.
        </p>
      </div>
      <ToolForm action="/tools/ai-txt" defaultValue={raw} />
      {error && <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{error}</p>}
      {content && (
        <GeneratorView title="ai.txt" filename="ai.txt" mime="text/plain" content={content} />
      )}
    </div>
  );
}

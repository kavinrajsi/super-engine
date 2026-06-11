"use client";

// Generators section: builds sitemap.xml and llms.txt from the current scan.

import {
  generateSitemap,
  generateLlms,
  generateRobotsTxt,
  generateAiTxt,
} from "@/lib/seo/generate";
import GeneratorView from "./generator-view";

export default function GeneratorsPanel({ result }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <GeneratorView
        title="Sitemap"
        filename="sitemap.xml"
        mime="application/xml"
        content={generateSitemap(result)}
      />
      <GeneratorView
        title="llms.txt"
        filename="llms.txt"
        mime="text/plain"
        content={generateLlms(result)}
        enhanceable
        site={result.rootUrl}
      />
      <GeneratorView
        title="robots.txt"
        filename="robots.txt"
        mime="text/plain"
        content={generateRobotsTxt(result)}
      />
      <GeneratorView
        title="ai.txt"
        filename="ai.txt"
        mime="text/plain"
        content={generateAiTxt(result)}
      />
    </div>
  );
}

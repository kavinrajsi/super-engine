// Generate llms.txt / robots.txt / JSON-LD from a site's scan, returned as a
// download. Reuses a recent cached scan; otherwise runs a cheap scan.

import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { runScan } from "@/lib/seo/analyze";
import { latestScanForUrl } from "@/lib/db/scans";
import { scanUrlCandidates } from "@/lib/site/active";
import { generateArtifact } from "@/lib/seo/generators";
import { rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const KINDS = new Set(["llms", "robots", "jsonld"]);

export async function GET(request) {
  const user = await currentUser();
  if (isAuthConfigured() && !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user?.id ?? null;

  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url") || "";
  const kind = KINDS.has(searchParams.get("kind")) ? searchParams.get("kind") : "llms";

  let safeUrl;
  try {
    safeUrl = assertSafeUrl(rawUrl).toString();
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }

  const limited = await rateLimitResponse(request, "generate", { limit: 30, windowSec: 600 }, userId);
  if (limited) return limited;

  let result = await latestScanForUrl(scanUrlCandidates(safeUrl), userId, 60);
  if (!result) {
    try {
      result = await runScan(safeUrl, { deepScan: false, maxPages: 1 });
    } catch (e) {
      return Response.json({ error: `Couldn't scan the site: ${e.message}` }, { status: 502 });
    }
  }

  const { text, filename, type } = generateArtifact(kind, result);
  return new Response(text, {
    headers: {
      "Content-Type": `${type}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

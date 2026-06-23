"use client";

// GEO tab — AI-search readiness (AEO/GEO/AIO/AGO + llms.txt/ai.txt/bot policy).
// Reuses the scan dashboard's AiReadinessPanel against the shared audit result.

import AiReadinessPanel from "@/app/scan/ai-readiness-panel";
import ScanGate from "./scan-gate";
import { useScan } from "./scan-context";

export default function GeoTab() {
  const { scan } = useScan() || {};
  return (
    <ScanGate>
      <AiReadinessPanel readiness={scan?.aiReadiness} url={scan?.rootUrl} />
    </ScanGate>
  );
}

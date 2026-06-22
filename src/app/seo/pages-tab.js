"use client";

// Pages tab — per-page breakdown for the audited site. Reuses the scan
// dashboard's PagesPanel against the shared audit result.

import PagesPanel from "@/app/scan/pages-panel";
import ScanGate from "./scan-gate";
import { useScan } from "./scan-context";

export default function PagesTab() {
  const { scan } = useScan() || {};
  return (
    <ScanGate>
      <PagesPanel result={scan} />
    </ScanGate>
  );
}

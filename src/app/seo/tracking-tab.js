"use client";

// Tracking tab — analytics & heatmap tools detected on the audited site.
// Reuses the scan dashboard's TrackingPanel against the shared audit result.

import TrackingPanel from "@/app/scan/tracking-panel";
import ScanGate from "./scan-gate";
import { useScan } from "./scan-context";

export default function TrackingTab() {
  const { scan } = useScan() || {};
  return (
    <ScanGate>
      <TrackingPanel analytics={scan?.analytics} />
    </ScanGate>
  );
}

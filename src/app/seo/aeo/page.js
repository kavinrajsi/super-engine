import { Suspense } from "react";
import AiLensDetail from "../ai-lens-detail";

export const metadata = { title: "AEO — Answer Engine Optimization — MadRank" };
export const dynamic = "force-dynamic";

export default function AeoPage() {
  return <Suspense><AiLensDetail lensKey="aeo" /></Suspense>;
}

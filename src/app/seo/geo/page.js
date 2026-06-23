import { Suspense } from "react";
import AiLensDetail from "../ai-lens-detail";

export const metadata = { title: "GEO — Generative Engine Optimization — MadRank" };
export const dynamic = "force-dynamic";

export default function GeoPage() {
  return <Suspense><AiLensDetail lensKey="geo" /></Suspense>;
}

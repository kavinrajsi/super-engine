import { Suspense } from "react";
import AiLensDetail from "../ai-lens-detail";

export const metadata = { title: "AGO — Agent & Bot Access — MadRank" };
export const dynamic = "force-dynamic";

export default function AgoPage() {
  return <Suspense><AiLensDetail lensKey="ago" /></Suspense>;
}

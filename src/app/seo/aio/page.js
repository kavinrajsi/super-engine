import { Suspense } from "react";
import AiLensDetail from "../ai-lens-detail";

export const metadata = { title: "AIO — AI Overviews Optimization — MadRank" };
export const dynamic = "force-dynamic";

export default function AioPage() {
  return <Suspense><AiLensDetail lensKey="aio" /></Suspense>;
}

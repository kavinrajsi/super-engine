// Streamed loading state while the scan runs on the server. Mirrors the
// dashboard shell (header + overview) with skeletons.

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen">
      <span className="sr-only" role="status" aria-live="polite">
        Running audit — reading the sitemap and grading each page…
      </span>

      <div className="flex h-14 items-center gap-3 border-b px-4">
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="h-4 w-48" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-14 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="flex flex-col items-center gap-6 rounded-xl border p-6 sm:flex-row">
          <Skeleton className="size-[140px] rounded-full" />
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-3 rounded-xl border p-6">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

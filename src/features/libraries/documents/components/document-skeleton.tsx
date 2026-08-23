import { Skeleton } from '@/components/ui/skeleton';

export function DocumentSkeleton() {
  return (
    <div
      className="bg-background flex h-full flex-col overflow-hidden"
      aria-busy="true"
      aria-label="Loading document"
    >
      {/* ── Top Header Skeleton ─────────────────────────────────────────── */}
      <div className="bg-background/95 border-border supports-[backdrop-filter]:bg-background/60 z-20 flex shrink-0 items-center justify-between border-b py-2 pr-4 pl-3 shadow-sm backdrop-blur">
        <div className="mr-4 flex-1 px-3 py-1">
          <Skeleton className="h-8 w-64 max-w-[60%] rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      {/* ── Metadata Bar Skeleton ────────────────────────────────────────── */}
      <div className="border-border shrink-0 border-b bg-zinc-50/50 px-8 py-4 dark:bg-zinc-900/20">
        <div className="flex flex-col gap-3">
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5 rounded-full" />
              <Skeleton className="h-3 w-28 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5 rounded-full" />
              <Skeleton className="h-3 w-28 rounded" />
            </div>
          </div>
          {/* Tag Chips Row */}
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      </div>

      {/* ── Document Body / Editor Area Skeleton ────────────────────────── */}
      <div className="relative flex-1 overflow-hidden p-6 md:p-10">
        <div className="mx-auto h-full max-w-5xl space-y-6">
          {/* Large Title / H1 */}
          <Skeleton className="h-8 w-2/5 rounded-md" />

          {/* Paragraph 1 */}
          <div className="space-y-3 pt-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-[94%] rounded" />
            <Skeleton className="h-4 w-[88%] rounded" />
            <Skeleton className="h-4 w-[76%] rounded" />
          </div>

          {/* Subheading / H2 */}
          <div className="space-y-3 pt-4">
            <Skeleton className="mb-2 h-6 w-1/3 rounded-md" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-[96%] rounded" />
            <Skeleton className="h-4 w-[90%] rounded" />
            <Skeleton className="h-4 w-[65%] rounded" />
          </div>

          {/* Additional text block */}
          <div className="space-y-3 pt-4">
            <Skeleton className="h-4 w-[92%] rounded" />
            <Skeleton className="h-4 w-[82%] rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

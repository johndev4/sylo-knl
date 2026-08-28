import { Skeleton } from '@/components/ui/skeleton';

export default function JoinPageLoading() {
  return (
    <div
      className="flex h-full w-full flex-col"
      aria-busy="true"
      aria-label="Loading library"
    >
      {/* ── Sidebar Skeleton ──────────────────────────────────────────── */}
      <div className="flex h-full">
        <div className="bg-background flex w-64 shrink-0 flex-col border-r p-4">
          {/* Library header */}
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          </div>

          {/* Search */}
          <Skeleton className="mb-4 h-9 w-full rounded-md" />

          {/* Section label */}
          <Skeleton className="mb-2 h-3 w-20 rounded" />

          {/* Document list items */}
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton
                  className="h-4 rounded"
                  style={{ width: `${60 + ((i * 7) % 30)}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Main Content Skeleton ───────────────────────────────────── */}
        <div className="flex flex-1 flex-col">
          {/* Top bar */}
          <div className="border-border flex h-14 shrink-0 items-center justify-between border-b px-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-sm" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>

          {/* Content area */}
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="w-full max-w-md space-y-6 text-center">
              <Skeleton className="mx-auto h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="mx-auto h-6 w-48 rounded-md" />
                <Skeleton className="mx-auto h-4 w-full rounded" />
                <Skeleton className="mx-auto h-4 w-3/4 rounded" />
              </div>
              <Skeleton className="mx-auto h-10 w-44 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

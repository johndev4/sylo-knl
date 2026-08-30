import { Skeleton } from '@/components/ui/skeleton';

export default function LibraryOverviewPageLoading() {
  return null;
}

export function LibraryOverviewContentLoading() {
  return (
    <>
      <div className="space-y-4 rounded-xl border p-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="space-y-4">
          <div>
            <Skeleton className="mb-1 h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>

          <div>
            <Skeleton className="mb-1 h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>

          <div>
            <Skeleton className="mb-1 h-4 w-20" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="mt-2 h-4 w-80 max-w-full" />
          </div>

          <div>
            <Skeleton className="mb-1 h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>

          <div>
            <Skeleton className="mb-1 h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
    </>
  );
}

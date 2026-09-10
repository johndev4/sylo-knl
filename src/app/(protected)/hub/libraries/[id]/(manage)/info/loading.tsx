import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function LibraryOverviewPageLoading() {
  return null;
}

export function LibraryOverviewContentLoading() {
  return (
    <Card className="space-y-4 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-40 animate-pulse rounded-md" />
        <Skeleton className="h-4 w-64 animate-pulse rounded-md" />
      </div>

      {/* Form-like fields */}
      <div className="space-y-4">
        {/* Library ID */}
        <div>
          <Skeleton className="h-4 w-24 animate-pulse rounded-md" />
          <Skeleton className="mt-1 h-9 w-full animate-pulse rounded-md" />
        </div>

        {/* Created */}
        <div>
          <Skeleton className="h-4 w-20 animate-pulse rounded-md" />
          <Skeleton className="mt-1 h-9 w-full animate-pulse rounded-md" />
        </div>

        {/* Role */}
        <div>
          <Skeleton className="h-4 w-20 animate-pulse rounded-md" />
          <Skeleton className="mt-1 h-9 w-full animate-pulse rounded-md" />
          <Skeleton className="mt-2 h-4 w-64 animate-pulse rounded-md" />
        </div>

        {/* Members */}
        <div>
          <Skeleton className="h-4 w-24 animate-pulse rounded-md" />
          <Skeleton className="mt-1 h-9 w-full animate-pulse rounded-md" />
        </div>

        {/* Documents */}
        <div>
          <Skeleton className="h-4 w-28 animate-pulse rounded-md" />
          <Skeleton className="mt-1 h-9 w-full animate-pulse rounded-md" />
        </div>
      </div>
    </Card>
  );
}

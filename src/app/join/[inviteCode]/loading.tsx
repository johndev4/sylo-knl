import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function JoinPageLoading() {
  return (
    <div className="bg-muted/30 flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-lg">
        {/* Header Section */}
        <div className="mb-6 text-center">
          {/* Badge */}
          <div className="mb-4 flex justify-center">
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>

          {/* Title */}
          <Skeleton className="mx-auto mb-4 h-8 w-48 rounded" />

          {/* Subtitle with library name */}
          <div className="mt-2 space-y-2">
            <Skeleton className="mx-auto h-4 w-56 rounded" />
            <Skeleton className="mx-auto h-4 w-32 rounded" />
          </div>
        </div>

        {/* Role Info Box */}
        <div className="bg-muted mb-6 flex items-center justify-between rounded-lg p-4">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>

        {/* User Info or CTA Section */}
        <div className="space-y-4">
          {/* User Avatar + Email */}
          <div className="bg-background mb-4 flex items-center gap-3 rounded-md border p-3">
            {/* Avatar */}
            <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />

            {/* Name and Email */}
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
          </div>

          {/* Primary Button */}
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function LibrarySettingsPageLoading() {
  return null;
}

export function LibrarySettingsContentLoading() {
  return (
    <>
      {/* Rename Library Skeleton */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-full max-w-[400px]" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-10 w-[120px]" />
            </div>
          </div>
        </div>
      </Card>

      {/* Delete Library Skeleton */}
      <Card className="border-red-100 bg-red-50/50 dark:border-red-900/20 dark:bg-red-950/10">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="mt-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <div className="ml-4 space-y-2.5 pt-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-1.5 w-1.5 rounded-full" />
                <Skeleton className="h-4 w-3/4 sm:w-[350px]" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-1.5 w-1.5 rounded-full" />
                <Skeleton className="h-4 w-2/3 sm:w-[300px]" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-1.5 w-1.5 rounded-full" />
                <Skeleton className="h-4 w-1/2 sm:w-[250px]" />
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="mt-1 h-3 w-48" />
          </div>

          <Skeleton className="mt-4 h-10 w-full" />
        </CardContent>
      </Card>
    </>
  );
}

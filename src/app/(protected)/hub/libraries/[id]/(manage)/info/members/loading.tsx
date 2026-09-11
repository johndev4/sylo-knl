import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function LibraryMembersPageLoading() {
  return null;
}

export function MemberTableSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className={`h-6 w-24`} />
            <Skeleton className={`mt-2 h-4 w-28`} />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <table className="w-full text-sm">
            <thead className="border-border">
              <tr>
                <th className="px-4 py-5 text-left">
                  <Skeleton className={`h-4 w-4`} />
                </th>
                <th className="px-4 py-5 text-left">
                  <Skeleton className={`h-4 w-16`} />
                </th>
                <th className="px-4 py-5 text-left">
                  <Skeleton className={`h-4 w-16`} />
                </th>
                <th className="px-4 py-5 text-left">
                  <Skeleton className={`h-4 w-16`} />
                </th>
                <th className="px-4 py-5 text-left">
                  <Skeleton className={`h-4 w-16`} />
                </th>
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-border border-t">
                  <td className="px-4 py-2">
                    <Skeleton className={`h-4 w-4`} />
                  </td>

                  <td className="px-4 py-2">
                    <div className="flex h-[41px] items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-2">
                    <Skeleton className="h-7 w-28" />
                  </td>

                  <td className="px-4 py-2">
                    <Skeleton className="h-7 w-28" />
                  </td>

                  <td className="px-4 py-2">
                    <Skeleton className="h-7 w-16" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="mt-3 flex items-center justify-between">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function InviteSectionSkeleton() {
  return (
    <Card className="p-6">
      {/* Header Section */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" /> {/* Title */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" /> {/* Description line 1 */}
          <Skeleton className="h-4 w-3/4" /> {/* Description line 2 */}
        </div>
      </div>

      {/* Form Section */}
      <div className="border-border bg-muted/20 space-y-4 rounded-md border p-4">
        <Skeleton className="h-5 w-32" /> {/* Form Title */}
        {/* Grid: 1 col on mobile, 2 on sm, 3 on lg */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Role Field */}
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-12" /> {/* Label */}
            <Skeleton className="h-9 w-full rounded-md" /> {/* Dropdown */}
          </div>

          {/* Expires in Field */}
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-16" /> {/* Label */}
            <Skeleton className="h-9 w-full rounded-md" /> {/* Dropdown */}
          </div>

          {/* Max Uses Field */}
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-20" /> {/* Label */}
            <Skeleton className="h-9 w-full rounded-md" /> {/* Input */}
          </div>
        </div>
        {/* Submit Button */}
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>

      {/* Active Invites Section */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <table className="w-full text-sm">
            <thead className="border-border">
              <tr>
                <th className="px-4 py-5 text-left">
                  <Skeleton className={`h-4 w-16`} />
                </th>
                <th className="px-4 py-5 text-left">
                  <Skeleton className={`h-4 w-16`} />
                </th>
                <th className="px-4 py-5 text-left">
                  <Skeleton className={`h-4 w-16`} />
                </th>
                <th className="px-4 py-5 text-left">
                  <Skeleton className={`h-4 w-16`} />
                </th>
                <th className="px-4 py-5 text-left">
                  <Skeleton className={`h-4 w-16`} />
                </th>
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-border border-t">
                  <td className="px-4 py-2">
                    <Skeleton className="h-7 w-24" />
                  </td>

                  <td className="px-4 py-2">
                    <Skeleton className="h-7 w-24" />
                  </td>

                  <td className="px-4 py-2">
                    <Skeleton className="h-7 w-24" />
                  </td>

                  <td className="px-4 py-2">
                    <Skeleton className="h-7 w-24" />
                  </td>

                  <td className="px-4 py-2">
                    <div className="flex flex-row gap-1">
                      <Skeleton className="h-7 w-16" />
                      <Skeleton className="h-7 w-16" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="mt-3 flex items-center justify-between">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
      </div>
    </Card>
  );
}

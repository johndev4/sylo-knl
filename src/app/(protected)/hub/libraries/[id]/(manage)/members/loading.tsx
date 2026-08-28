import { Skeleton } from '@/components/ui/skeleton';

export default function LibraryMembersPageLoading() {
  return null;
  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-6">
      <div className="mb-8 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className={`h-9 w-64`} />
            <Skeleton className={`h-5 w-72`} />
          </div>
        </div>
      </div>

      <MemberTableSkeleton />
      <InviteSectionSkeleton />
    </div>
  );
}

export function MemberTableSkeleton() {
  const rows = Array.from({ length: 5 });

  return (
    <div className="space-y-4 rounded-xl border p-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className={`h-6 w-24`} />
            <Skeleton className={`mt-2 h-4 w-28`} />
          </div>
          <Skeleton className={`h-9 w-36`} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="max-h-90 min-w-[700px]">
          <table className="w-full text-sm">
            <thead className="border-border border-b">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Skeleton className={`h-4 w-4`} />
                </th>
                <th className="px-4 py-3 text-left">
                  <Skeleton className={`h-4 w-12`} />
                </th>
                <th className="px-4 py-3 text-left">
                  <Skeleton className={`h-4 w-14`} />
                </th>
                <th className="px-4 py-3 text-left">
                  <Skeleton className={`h-4 w-12`} />
                </th>
                <th className="px-4 py-3 text-left">
                  <Skeleton className={`h-4 w-14`} />
                </th>
                <th className="px-4 py-3 text-left">
                  <Skeleton className={`h-4 w-16`} />
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((_, index) => (
                <tr key={index} className="border-border border-b">
                  <td className="px-4 py-3">
                    <Skeleton className={`h-4 w-4`} />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className={`h-8 w-8 shrink-0 rounded-full`} />
                      <Skeleton className={`h-4 w-28`} />
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <Skeleton className={`h-4 w-40`} />
                  </td>

                  <td className="px-4 py-3">
                    <Skeleton className={`h-8 w-[110px]`} />
                  </td>

                  <td className="px-4 py-3">
                    <Skeleton className={`h-4 w-20`} />
                  </td>

                  <td className="px-4 py-3">
                    <Skeleton className={`h-8 w-16`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function InviteSectionSkeleton() {
  const rows = Array.from({ length: 3 });

  return (
    <div className="space-y-4 rounded-xl border p-6">
      <div className="space-y-2">
        <Skeleton className={`h-6 w-32`} />
        <Skeleton className={`h-4 w-80 max-w-full`} />
      </div>

      <div className="bg-muted/20 space-y-4 overflow-x-auto rounded-md border p-4">
        <Skeleton className={`h-5 w-40`} />

        <div className="flex flex-wrap gap-2.5">
          <div>
            <Skeleton className={`h-4 w-12`} />
            <Skeleton className={`mt-1 h-10 w-48`} />
          </div>

          <div>
            <Skeleton className={`h-4 w-32`} />
            <Skeleton className={`mt-1 h-10 w-52`} />
          </div>

          <div>
            <Skeleton className={`h-4 w-36`} />
            <Skeleton className={`mt-1 h-10 w-40`} />
          </div>
        </div>

        <Skeleton className={`h-10 w-44`} />
      </div>

      <div className="mt-6">
        <Skeleton className={`mb-4 h-5 w-28`} />

        <div className="overflow-x-auto">
          <div className="max-h-60 min-w-[650px]">
            <table className="w-full text-sm">
              <thead className="border-border border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <Skeleton className={`h-4 w-12`} />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Skeleton className={`h-4 w-12`} />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Skeleton className={`h-4 w-12`} />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Skeleton className={`h-4 w-14`} />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Skeleton className={`h-4 w-16`} />
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((_, index) => (
                  <tr key={index} className="border-border border-b">
                    <td className="px-4 py-3">
                      <Skeleton className={`h-4 w-28`} />
                    </td>

                    <td className="px-4 py-3">
                      <Skeleton className={`h-4 w-16`} />
                    </td>

                    <td className="px-4 py-3">
                      <Skeleton className={`h-4 w-16`} />
                    </td>

                    <td className="px-4 py-3">
                      <Skeleton className={`h-4 w-32`} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Skeleton className={`h-8 w-14`} />
                        <Skeleton className={`h-8 w-16`} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from '@/components/ui/skeleton';

export default function AccountSettingsPageLoading() {
  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <Skeleton className={`h-9 w-56`} />
            <Skeleton className={`mt-2 h-5 w-64`} />
          </div>

          {/* Profile Card */}
          <div className="rounded-xl border">
            {/* Card Header */}
            <div className="space-y-1.5 p-6">
              <Skeleton className={`h-6 w-40`} />
              <Skeleton className={`h-4 w-full max-w-md`} />
            </div>

            {/* Card Content */}
            <div className="p-6 pt-0">
              <div className="space-y-6">
                {/* Email */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Skeleton className={`h-4 w-12`} />
                    <Skeleton className={`mt-1 h-10 w-full`} />
                    <Skeleton className={`mt-1 h-3 w-32`} />
                  </div>
                </div>

                {/* Avatar Display Section */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-6 dark:border-neutral-800 dark:bg-neutral-900/50">
                  <Skeleton className={`mb-4 h-5 w-32`} />

                  <div className="flex flex-wrap gap-4">
                    {/* Google Picture */}
                    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 p-4">
                      <Skeleton className={`h-20 w-20 rounded-full`} />
                      <Skeleton className={`h-3 w-24`} />
                    </div>

                    {/* Initials */}
                    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 p-4">
                      <Skeleton className={`h-20 w-20 rounded-full`} />
                      <Skeleton className={`h-3 w-16`} />
                    </div>
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <Skeleton className={`h-4 w-12`} />
                    <Skeleton className={`mt-1 h-10 w-full`} />
                  </div>

                  {/* Bio */}
                  <div>
                    <Skeleton className={`h-4 w-8`} />
                    <Skeleton className={`mt-1 h-24 w-full`} />

                    <div className="mt-1 flex items-center justify-between">
                      <Skeleton className={`h-3 w-28`} />
                      <Skeleton className={`h-3 w-12`} />
                    </div>
                  </div>

                  {/* Timezone */}
                  <div>
                    <Skeleton className={`h-4 w-16`} />
                    <Skeleton className={`mt-1 h-10 w-full`} />
                  </div>
                </div>

                {/* Submit Button Section */}
                <div className="border-border flex flex-col items-center justify-end gap-4 border-t pt-4 sm:flex-row">
                  <Skeleton className={`h-4 w-56 max-w-full`} />

                  <div className="flex w-full gap-3 sm:w-auto">
                    <Skeleton
                      className={`h-10 w-full flex-1 sm:min-w-[140px]`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

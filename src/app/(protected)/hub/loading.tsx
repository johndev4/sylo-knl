import { Skeleton } from '@/components/ui/skeleton';

// ---------------------------------------------------------------------------
// HubPage Loading Skeleton  (Next.js route segment loading.tsx)
// Mirrors the layout of HubPage when the user has libraries:
//   1. LibrarySummaryHero  — dark hero card + feature info card
//   2. LibrariesContainer  — search/filter controls + bento grid of library cards
// ---------------------------------------------------------------------------

export default function HubPageLoading() {
  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* ------------------------------------------------------------------ */}
      {/* Section 1 · LibrarySummaryHero                                      */}
      {/* mb-8 grid gap-4 xl:grid-cols-[1.8fr_1fr]                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-8 grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        {/* Dark hero card */}
        <div className="overflow-hidden rounded-xl border-0 bg-slate-950/80 p-8 shadow-2xl sm:p-10">
          <div className="space-y-6">
            {/* Eyebrow label + heading + sub-text */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-40 bg-slate-700" />
              <Skeleton className="h-8 w-72 bg-slate-700" />
              <Skeleton className="h-4 w-full max-w-md bg-slate-700" />
            </div>

            {/* Stats row – grid gap-4 sm:grid-cols-3 */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <Skeleton className="h-3 w-16 bg-slate-700" />
                <Skeleton className="mt-3 h-8 w-10 bg-slate-700" />
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <Skeleton className="h-3 w-20 bg-slate-700" />
                <Skeleton className="mt-3 h-8 w-10 bg-slate-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Feature info card */}
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 p-6 shadow-sm dark:border-zinc-800">
            {/* CardHeader */}
            <div className="mb-4 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
            {/* CardContent – two feature rows */}
            <div className="grid gap-3">
              <div className="rounded-3xl bg-zinc-100 p-4 dark:bg-zinc-950">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-2 h-3 w-full" />
              </div>
              <div className="rounded-3xl bg-zinc-100 p-4 dark:bg-zinc-950">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-1 h-3 w-4/5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2 · LibrariesContainer                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="w-full space-y-4">
        {/* Controls row ---------------------------------------------------- */}
        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          {/* Left: Search + Role filter + Sort */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Skeleton className="h-9 w-full rounded-md sm:w-48" />
            <Skeleton className="h-8 w-full rounded-md sm:w-24" />
            <Skeleton className="h-8 w-full rounded-md sm:w-24" />
          </div>

          {/* Right: View toggle pill + Create button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-100/50 p-1 dark:border-zinc-800 dark:bg-zinc-900/50">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
        </div>

        {/* Results count */}
        <Skeleton className="h-4 w-40" />

        {/* Bento grid of library cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* First card is "featured" (md:col-span-2) when > 2 libraries */}
          <LibraryCardSkeleton featured />
          <LibraryCardSkeleton />
          <LibraryCardSkeleton />
          <LibraryCardSkeleton />
          <LibraryCardSkeleton />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: single library card skeleton
// Mirrors the Card inside LibrariesBentoGrid
// ---------------------------------------------------------------------------
function LibraryCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div className={featured ? 'h-full md:col-span-2' : 'h-full'}>
      <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200/50 bg-white/60 p-6 shadow-sm backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-950/60">
        <div className="space-y-4">
          {/* Library name + role badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2 overflow-hidden">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>

          {/* Meta: date · members · docs */}
          <Skeleton className="h-4 w-3/4" />

          {/* Action buttons */}
          <div
            className={
              featured
                ? 'mt-auto grid grid-cols-2 gap-2 sm:w-2/3'
                : 'mt-auto grid grid-cols-2 gap-2'
            }
          >
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

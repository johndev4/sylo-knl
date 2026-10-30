import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { HubData } from '../hub-schema';

interface LibrarySummaryHeroProps {
  hubData: HubData;
}

export function LibrarySummaryHero({ hubData }: LibrarySummaryHeroProps) {
  const totalLibraries = hubData.length;
  const totalDocs = hubData.reduce(
    (sum, dataItem) => sum + dataItem.docCount,
    0
  );

  return (
    <section className="mb-6 grid gap-4 sm:mb-8 xl:grid-cols-[1.8fr_1fr]">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-neutral-950 text-white shadow-2xl">
        <CardContent className="space-y-5 p-5 sm:space-y-6 sm:p-8 lg:p-10">
          <div className="space-y-2">
            <p className="text-xs tracking-[0.12em] text-slate-300 uppercase sm:text-sm sm:tracking-[0.24em]">
              Library Hub overview
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Your knowledge command center
            </h2>
            <p className="max-w-2xl text-sm text-slate-300/90">
              Launch AI chat, manage documents, and keep every library aligned
              with the team.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 sm:rounded-3xl sm:p-5">
              <p className="text-[10px] tracking-[0.12em] text-slate-400 uppercase sm:text-xs sm:tracking-[0.24em]">
                Libraries
              </p>
              <p className="mt-2 text-2xl font-semibold sm:mt-3 sm:text-3xl">
                {totalLibraries}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 sm:rounded-3xl sm:p-5">
              <p className="text-[10px] tracking-[0.12em] text-slate-400 uppercase sm:text-xs sm:tracking-[0.24em]">
                Documents
              </p>
              <p className="mt-2 text-2xl font-semibold sm:mt-3 sm:text-3xl">
                {totalDocs}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-neutral-200 shadow-sm dark:border-neutral-800">
          <CardHeader>
            <CardTitle>AI-first search</CardTitle>
            <CardDescription>
              Answer questions with context from your own library documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-lg bg-neutral-100 p-3 sm:rounded-3xl sm:p-4 dark:bg-neutral-950">
              <p className="text-sm font-medium">Fast context retrieval</p>
              <p className="text-muted-foreground mt-2 text-sm">
                Every document is embedded and indexed for precise results.
              </p>
            </div>
            <div className="rounded-lg bg-neutral-100 p-3 sm:rounded-3xl sm:p-4 dark:bg-neutral-950">
              <p className="text-sm font-medium">Collaborative knowledge</p>
              <p className="text-muted-foreground mt-2 text-sm">
                Invite teammates, share libraries, and reduce duplicated
                onboarding.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

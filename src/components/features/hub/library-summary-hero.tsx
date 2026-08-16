import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type Membership = {
  role: string;
  library: { id: string; name: string; created_at: string };
  memberCount: number;
  docCount: number;
};

interface LibrarySummaryHeroProps {
  memberships: Membership[];
}

export function LibrarySummaryHero({ memberships }: LibrarySummaryHeroProps) {
  const totalLibraries = memberships.length;
  const totalDocs = memberships.reduce(
    (sum, membership) => sum + membership.docCount,
    0
  );

  return (
    <section className="mb-8 grid gap-4 xl:grid-cols-[1.8fr_1fr]">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 text-white shadow-2xl">
        <CardContent className="space-y-6 p-8 sm:p-10">
          <div className="space-y-2">
            <p className="text-sm tracking-[0.24em] text-slate-300 uppercase">
              Library Hub overview
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              Your knowledge command center
            </h2>
            <p className="max-w-2xl text-sm text-slate-300/90">
              Launch AI chat, manage documents, and keep every library aligned
              with the team.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs tracking-[0.24em] text-slate-400 uppercase">
                Libraries
              </p>
              <p className="mt-3 text-3xl font-semibold">{totalLibraries}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs tracking-[0.24em] text-slate-400 uppercase">
                Documents
              </p>
              <p className="mt-3 text-3xl font-semibold">{totalDocs}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-zinc-200 shadow-sm dark:border-zinc-800">
          <CardHeader>
            <CardTitle>AI-first search</CardTitle>
            <CardDescription>
              Answer questions with context from your own library documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-3xl bg-zinc-100 p-4 dark:bg-zinc-950">
              <p className="text-sm font-medium">Fast context retrieval</p>
              <p className="text-muted-foreground mt-2 text-sm">
                Every document is embedded and indexed for precise results.
              </p>
            </div>
            <div className="rounded-3xl bg-zinc-100 p-4 dark:bg-zinc-950">
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

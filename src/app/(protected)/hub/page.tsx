import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  CreateLibraryDialog,
  LibrariesContainer,
  LibrarySummaryHero,
} from '@/features/hub/components';
import { getUser } from '@/lib/auth/get-user';
import { getHubData } from '@/features/hub/queries';

export default async function HubPage() {
  const user = await getUser();
  const supabase = await createClient();

  const hubData = await getHubData(supabase, user);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-5 sm:p-6">
      {hubData.length === 0 ? (
        <div className="grid items-start gap-6 lg:grid-cols-[1.8fr_1fr]">
          <div className="rounded-2xl border border-neutral-200/50 bg-white/60 p-6 text-center shadow-lg shadow-slate-900/5 backdrop-blur-md sm:rounded-3xl sm:p-10 dark:border-neutral-800/50 dark:bg-neutral-950/60">
            <div className="bg-primary/10 text-primary mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 7.5a2.5 2.5 0 012.5-2.5h13A2.5 2.5 0 0121 7.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 16.5v-9z" />
                <path d="M3 10h18" />
              </svg>
            </div>
            <p className="text-lg font-semibold">You have no libraries yet</p>
            <p className="text-muted-foreground mt-2 text-sm">
              Create your first library to start organizing your knowledge and
              interacting with AI on your own documents.
            </p>
            <div className="mt-6">
              <CreateLibraryDialog triggerText="Create your first library" />
            </div>
          </div>

          <div className="space-y-4">
            <Card className="rounded-2xl border border-neutral-200/50 bg-white/60 shadow-sm backdrop-blur-md sm:rounded-3xl dark:border-neutral-800/50 dark:bg-neutral-950/60">
              <CardHeader>
                <CardTitle>Why Sylo?</CardTitle>
                <CardDescription>
                  Align teams, reduce repeated onboarding, and keep knowledge
                  searchable.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  Create structured libraries for projects, teams, or products.
                  Every doc becomes searchable with AI-powered context.
                </p>
                <ul className="text-foreground space-y-2 text-sm">
                  <li>• Add documents and auto-generate embeddings</li>
                  <li>• Ask the library AI about your content</li>
                  <li>• Invite teammates and collaborate in shared spaces</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-neutral-200/50 bg-white/60 shadow-sm backdrop-blur-md sm:rounded-3xl dark:border-neutral-800/50 dark:bg-neutral-950/60">
              <CardHeader>
                <CardTitle>Get started fast</CardTitle>
                <CardDescription>
                  Focus on the knowledge your team needs most.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  Build a shared library with support docs, policies, team
                  notes, and research summaries.
                </p>
                <p className="text-muted-foreground text-sm">
                  Then ask the AI for answers without switching between tools.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <>
          <LibrarySummaryHero hubData={hubData} />
          <LibrariesContainer hubData={hubData} />
        </>
      )}
    </div>
  );
}

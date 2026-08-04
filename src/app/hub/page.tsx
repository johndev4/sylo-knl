import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
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
} from './_components';

export default async function LibrariesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch libraries user is a member of with counts
  const { data: spaceMemberships } = await supabase
    .from('library_members')
    .select(
      `
      role,
      library:libraries ( id, name, created_at )
    `
    )
    .eq('user_id', user.id);

  // Fetch member counts and document counts for each library
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const libraryIds = (spaceMemberships || []).map((m: any) => m.library.id);

  let memberCounts: Record<string, number> = {};
  let docCounts: Record<string, number> = {};

  if (libraryIds.length > 0) {
    // Get member counts
    const { data: memberCountData } = await supabase
      .from('library_members')
      .select('library_id')
      .in('library_id', libraryIds);

    memberCounts = (memberCountData || []).reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (acc: Record<string, number>, item: any) => {
        acc[item.library_id] = (acc[item.library_id] || 0) + 1;
        return acc;
      },
      {}
    );

    // Get document counts
    const { data: docCountData } = await supabase
      .from('documents')
      .select('library_id')
      .in('library_id', libraryIds);

    docCounts = (docCountData || []).reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (acc: Record<string, number>, item: any) => {
        acc[item.library_id] = (acc[item.library_id] || 0) + 1;
        return acc;
      },
      {}
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberships = (spaceMemberships || []).map((m: any) => ({
    role: m.role,
    library: m.library,
    memberCount: memberCounts[m.library.id] || 0,
    docCount: docCounts[m.library.id] || 0,
  })) as Array<{
    role: string;
    library: { id: string; name: string; created_at: string };
    memberCount: number;
    docCount: number;
  }>;

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mb-1 text-3xl font-bold tracking-tight">
            Your Libraries
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage your knowledge bases, documents, and AI chat hubs.
          </p>
        </div>
      </div>

      {memberships.length === 0 ? (
        <div className="grid items-start gap-6 lg:grid-cols-[1.8fr_1fr]">
          <div className="rounded-3xl border border-zinc-200/50 bg-white/60 p-10 text-center shadow-lg shadow-slate-900/5 backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-950/60">
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
            <Card className="rounded-3xl border border-zinc-200/50 bg-white/60 p-6 shadow-sm backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-950/60">
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
            <Card className="rounded-3xl border border-zinc-200/50 bg-white/60 p-6 shadow-sm backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-950/60">
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
          <LibrarySummaryHero memberships={memberships} />
          <LibrariesContainer memberships={memberships} />
        </>
      )}
    </div>
  );
}

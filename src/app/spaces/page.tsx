import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateWorkspaceDialog } from "@/components/CreateWorkspaceDialog";
import { WorkspacesContainer } from "@/components/WorkspacesContainer";
import { WorkspaceSummaryHero } from "@/components/kokonutui/WorkspaceSummaryHero";

export default async function SpacesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch workspaces user is a member of with counts
  const { data: spaceMemberships } = await supabase
    .from("workspace_members")
    .select(`
      role,
      workspace:workspaces ( id, name, created_at )
    `)
    .eq("user_id", user.id);

  // Fetch member counts and document counts for each workspace
  const workspaceIds = (spaceMemberships || []).map((m: any) => m.workspace.id);

  let memberCounts: Record<string, number> = {};
  let docCounts: Record<string, number> = {};

  if (workspaceIds.length > 0) {
    // Get member counts
    const { data: memberCountData } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .in("workspace_id", workspaceIds);

    memberCounts = (memberCountData || []).reduce((acc: Record<string, number>, item: any) => {
      acc[item.workspace_id] = (acc[item.workspace_id] || 0) + 1;
      return acc;
    }, {});

    // Get document counts
    const { data: docCountData } = await supabase
      .from("documents")
      .select("workspace_id")
      .in("workspace_id", workspaceIds);

    docCounts = (docCountData || []).reduce((acc: Record<string, number>, item: any) => {
      acc[item.workspace_id] = (acc[item.workspace_id] || 0) + 1;
      return acc;
    }, {});
  }

  const memberships = (spaceMemberships || []).map((m: any) => ({
    role: m.role,
    workspace: m.workspace,
    memberCount: memberCounts[m.workspace.id] || 0,
    docCount: docCounts[m.workspace.id] || 0,
  })) as Array<{
    role: string;
    workspace: { id: string; name: string; created_at: string };
    memberCount: number;
    docCount: number;
  }>;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Your Workspaces</h1>
          <p className="text-sm text-muted-foreground">Manage your knowledge bases, documents, and AI chat hubs.</p>
        </div>
      </div>

      {memberships.length === 0 ? (
        <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr] items-start">
          <div className="rounded-3xl border border-zinc-200 bg-white/80 p-10 text-center shadow-lg shadow-slate-900/5 dark:border-zinc-800 dark:bg-zinc-950/90">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
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
            <p className="text-lg font-semibold">You have no workspaces yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Create your first workspace to start organizing your knowledge and interacting with AI on your own documents.</p>
            <div className="mt-6">
              <CreateWorkspaceDialog triggerText="Create your first workspace" />
            </div>
          </div>

          <div className="space-y-4">
            <Card className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <CardHeader>
                <CardTitle>Why Sylo?</CardTitle>
                <CardDescription>Align teams, reduce repeated onboarding, and keep knowledge searchable.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Create structured workspaces for projects, teams, or products. Every doc becomes searchable with AI-powered context.</p>
                <ul className="space-y-2 text-sm text-foreground">
                  <li>• Add documents and auto-generate embeddings</li>
                  <li>• Ask the workspace AI about your content</li>
                  <li>• Invite teammates and collaborate in shared spaces</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <CardHeader>
                <CardTitle>Get started fast</CardTitle>
                <CardDescription>Focus on the knowledge your team needs most.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Build a shared library with support docs, policies, team notes, and research summaries.</p>
                <p className="text-sm text-muted-foreground">Then ask the AI for answers without switching between tools.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <>
          <WorkspaceSummaryHero memberships={memberships} />
          <WorkspacesContainer memberships={memberships} />
        </>
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CreateWorkspaceDialog } from "@/components/CreateWorkspaceDialog";
import { WorkspacesContainer } from "@/components/WorkspacesContainer";

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
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Your Workspaces</h1>
          <p className="text-sm text-muted-foreground">Manage your knowledge bases and documents</p>
        </div>
        <CreateWorkspaceDialog size="sm" variant="outline" />
      </div>

      {/* Empty state or container */}
      {memberships.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="rounded-full bg-muted p-5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5a2.5 2.5 0 012.5-2.5h13A2.5 2.5 0 0121 7.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 16.5v-9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold">You have no workspaces</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first workspace to start organizing your knowledge.
            </p>
          </div>
          <CreateWorkspaceDialog triggerText="Create your first workspace" />
        </div>
      ) : (
        <WorkspacesContainer memberships={memberships} />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  fetchWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  removeMultipleWorkspaceMembers,
} from '@/lib/actions/workspaces';
import MemberTable from '@/components/workspace-settings/MemberTable';
import AddMemberForm from '@/components/workspace-settings/AddMemberForm';
import { DeleteWorkspaceForm } from '@/components/workspace-settings/DeleteWorkspaceForm';
import { RenameWorkspaceForm } from '@/components/workspace-settings/RenameWorkspaceForm';
import { useAuth } from '@/lib/hooks/useAuth';

interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  created_at: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

export default function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isAddingMember, setIsAddingMember] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setWorkspaceId(resolvedParams.id);
    };
    loadParams();
  }, [params]);

  useEffect(() => {
    if (!workspaceId || !user) return;

    const loadMembers = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await fetchWorkspaceMembers(workspaceId);
        setMembers(data);

        // Find current user's role
        const currentMember = data.find(
          (m: WorkspaceMember) => m.user_id === user.id
        );
        setCurrentUserRole(currentMember?.role || '');
        
        // Extract workspace name from the first member if available
        // In a real scenario, you'd want to fetch the workspace directly
        // For now, we'll fetch it from Supabase client
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: workspaceData } = await supabase
          .from('workspaces')
          .select('name')
          .eq('id', workspaceId)
          .single();
        
        if (workspaceData?.name) {
          setWorkspaceName(workspaceData.name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setIsLoading(false);
      }
    };

    loadMembers();
  }, [workspaceId, user]);

  const handleAddMember = async (email: string, role: string) => {
    try {
      setIsAddingMember(true);
      await addWorkspaceMember(
        workspaceId,
        email,
        role as 'ADMIN' | 'EDITOR' | 'VIEWER'
      );
      const updatedMembers = await fetchWorkspaceMembers(workspaceId);
      setMembers(updatedMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateWorkspaceMemberRole(
        workspaceId,
        userId,
        newRole as 'ADMIN' | 'EDITOR' | 'VIEWER'
      );
      const updatedMembers = await fetchWorkspaceMembers(workspaceId);
      setMembers(updatedMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await removeWorkspaceMember(workspaceId, userId);
      const updatedMembers = await fetchWorkspaceMembers(workspaceId);
      setMembers(updatedMembers);
      setSelectedMembers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleRemoveMultiple = async () => {
    if (selectedMembers.size === 0) return;
    if (
      !confirm(
        `Are you sure you want to remove ${selectedMembers.size} member(s)?`
      )
    )
      return;

    try {
      await removeMultipleWorkspaceMembers(
        workspaceId,
        Array.from(selectedMembers)
      );
      const updatedMembers = await fetchWorkspaceMembers(workspaceId);
      setMembers(updatedMembers);
      setSelectedMembers(new Set());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to remove members'
      );
    }
  };

  const canManageMembers = ['OWNER', 'ADMIN'].includes(currentUserRole);

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Workspace Settings
            </h1>
            <p className="text-muted-foreground">
              Manage members and workspace settings
            </p>
          </div>
          <Link href={`/spaces/${workspaceId}/documents`}>
            <Button variant="outline">Back to Workspace</Button>
          </Link>
        </div>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Workspace Settings
          </h1>
          <p className="text-muted-foreground">
            Manage members and workspace settings
          </p>
        </div>
        <Link href={`/spaces/${workspaceId}/documents`}>
          <Button variant="outline">Back to Workspace</Button>
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => setError('')}
            className="text-xs mt-2 underline text-red-600 dark:text-red-500"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Workspace Renaming Section */}
      {canManageMembers && (
        <RenameWorkspaceForm 
          workspaceId={workspaceId} 
          initialName={workspaceName} 
        />
      )}

      {/* Add Member Section */}
      {canManageMembers && (
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Add Member</h2>
            <p className="text-sm text-muted-foreground">
              Invite new members to your workspace
            </p>
          </div>
          <AddMemberForm
            onAddMember={handleAddMember}
            isLoading={isAddingMember}
            memberCount={members.length}
          />
        </Card>
      )}

      {/* Members List Section */}
      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Members</h2>
              <p className="text-sm text-muted-foreground">
                {members.length} of 11 members
              </p>
            </div>
            {canManageMembers && selectedMembers.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveMultiple}
              >
                Remove {selectedMembers.size} member(s)
              </Button>
            )}
          </div>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No members yet</p>
          </div>
        ) : (
          <MemberTable
            members={members}
            currentUserRole={currentUserRole}
            canManageMembers={canManageMembers}
            selectedMembers={selectedMembers}
            onSelectMember={(userId) => {
              setSelectedMembers((prev) => {
                const next = new Set(prev);
                if (next.has(userId)) {
                  next.delete(userId);
                } else {
                  next.add(userId);
                }
                return next;
              });
            }}
            onRemoveMember={handleRemoveMember}
            onUpdateRole={handleUpdateRole}
          />
        )}
      </Card>

      {/* Workspace Information */}
      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Workspace Information</h2>
          <p className="text-sm text-muted-foreground">
            View important workspace details
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Workspace ID</Label>
            <Input
              value={workspaceId}
              disabled
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Your Role</Label>
            <Input
              value={currentUserRole}
              disabled
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Member Limit</Label>
            <Input
              value={`${members.length} / 11`}
              disabled
              className="mt-1 text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Delete Workspace Section - Owner Only */}
      {currentUserRole === 'OWNER' && (
        <DeleteWorkspaceForm 
          workspaceId={workspaceId} 
          workspaceName={workspaceName || 'this workspace'}
        />
      )}
    </div>
  );
}

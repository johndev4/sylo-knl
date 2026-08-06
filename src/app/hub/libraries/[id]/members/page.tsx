'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  fetchLibraryMembers,
  updateLibraryMemberRole,
  removeLibraryMember,
  removeMultipleLibraryMembers,
} from '@/lib/actions/libraries';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  InviteSection,
  MemberTable,
} from '@/app/hub/libraries/[id]/members/_components';

interface LibraryMember {
  library_id: string;
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

export default function LibrarySettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [libraryId, setLibraryId] = useState<string>('');
  const [members, setMembers] = useState<LibraryMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );

  const { user } = useAuth();

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setLibraryId(resolvedParams.id);
    };
    loadParams();
  }, [params]);

  useEffect(() => {
    if (!libraryId || !user) return;

    const loadMembers = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await fetchLibraryMembers(libraryId);
        setMembers(data);

        // Find current user's role
        const currentMember = data.find(
          (m: LibraryMember) => m.user_id === user.id
        );
        setCurrentUserRole(currentMember?.role || '');

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setIsLoading(false);
      }
    };

    loadMembers();
  }, [libraryId, user]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateLibraryMemberRole(
        libraryId,
        userId,
        newRole as 'ADMIN' | 'EDITOR' | 'VIEWER'
      );
      const updatedMembers = await fetchLibraryMembers(libraryId);
      setMembers(updatedMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeLibraryMember(libraryId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
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
    const ids = Array.from(selectedMembers);
    try {
      await removeMultipleLibraryMembers(libraryId, ids);
      setMembers((prev) => prev.filter((m) => !ids.includes(m.user_id)));
      setSelectedMembers(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove members');
    }
  };

  const canManageMembers = ['OWNER', 'ADMIN'].includes(currentUserRole);

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Library Members
            </h1>
            <p className="text-muted-foreground">Manage library members</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => setError('')}
            className="mt-2 text-xs text-red-600 underline dark:text-red-500"
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center">Loading...</div>
      ) : (
        <>
          {/* Invite Links Section */}
          {canManageMembers && <InviteSection libraryId={libraryId} />}

          {/* Members List Section */}
          <Card className="space-y-4 p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Members</h2>
                  <p className="text-muted-foreground text-sm">
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
              <div className="py-8 text-center">
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
        </>
      )}
    </div>
  );
}

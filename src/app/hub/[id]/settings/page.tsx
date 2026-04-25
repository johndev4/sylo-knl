'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LibraryNav from '@/components/library-settings/LibraryNav';
import {
  fetchLibraryMembers,
  addLibraryMember,
  updateLibraryMemberRole,
  removeLibraryMember,
  removeMultipleLibraryMembers,
} from '@/lib/actions/libraries';
import MemberTable from '@/components/library-settings/MemberTable';
import AddMemberForm from '@/components/library-settings/AddMemberForm';
import { DeleteLibraryForm } from '@/components/library-settings/DeleteLibraryForm';
import { RenameLibraryForm } from '@/components/library-settings/RenameLibraryForm';
import { useAuth } from '@/lib/hooks/useAuth';

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
  const [libraryName, setLibraryName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isAddingMember, setIsAddingMember] = useState(false);
  const router = useRouter();
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
        
        // Extract library name from the first member if available
        // In a real scenario, you'd want to fetch the library directly
        // For now, we'll fetch it from Supabase client
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: libraryData } = await supabase
          .from('libraries')
          .select('name')
          .eq('id', libraryId)
          .single();
        
        if (libraryData?.name) {
          setLibraryName(libraryData.name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setIsLoading(false);
      }
    };

    loadMembers();
  }, [libraryId, user]);

  const handleAddMember = async (email: string, role: string) => {
    try {
      setIsAddingMember(true);
      await addLibraryMember(
        libraryId,
        email,
        role as 'ADMIN' | 'EDITOR' | 'VIEWER'
      );
      const updatedMembers = await fetchLibraryMembers(libraryId);
      setMembers(updatedMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

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
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await removeLibraryMember(libraryId, userId);
      const updatedMembers = await fetchLibraryMembers(libraryId);
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
      await removeMultipleLibraryMembers(
        libraryId,
        Array.from(selectedMembers)
      );
      const updatedMembers = await fetchLibraryMembers(libraryId);
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
        <div className="flex flex-col gap-3 mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Library Settings</h1>
            <p className="text-muted-foreground">Manage members and library settings</p>
          </div>
          <LibraryNav libraryId={libraryId} currentSection="settings" />
        </div>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-8">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Library Settings</h1>
            <p className="text-muted-foreground">Manage members and library settings</p>
          </div>
          <Link href={`/hub/${libraryId}/documents`}>
            <Button variant="outline">Back to Library</Button>
          </Link>
        </div>
        <LibraryNav libraryId={libraryId} currentSection="settings" />
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

      {/* Library Renaming Section */}
      {canManageMembers && (
        <RenameLibraryForm 
          libraryId={libraryId} 
          initialName={libraryName} 
        />
      )}

      {/* Add Member Section */}
      {canManageMembers && (
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Add Member</h2>
            <p className="text-sm text-muted-foreground">
              Invite new members to your library
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

      {/* Library Information */}
      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Library Information</h2>
          <p className="text-sm text-muted-foreground">
            View important library details
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Library ID</Label>
            <Input
              value={libraryId}
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

      {/* Delete Library Section - Owner Only */}
      {currentUserRole === 'OWNER' && (
        <DeleteLibraryForm 
          libraryId={libraryId} 
          libraryName={libraryName || 'this library'}
        />
      )}
    </div>
  );
}

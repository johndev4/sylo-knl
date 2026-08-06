'use client';

import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  fetchLibraryMembers,
  removeLibraryMember,
  removeMultipleLibraryMembers,
} from '@/lib/actions/libraries';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  DeleteLibraryForm,
  RenameLibraryForm,
} from '@/app/hub/libraries/[id]/settings/_components';

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
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );
  // removePending describes the pending remove action:
  //   { type: 'single'; userId: string; name: string } | { type: 'bulk'; count: number } | null
  const [removePending, setRemovePending] = useState<
    | { type: 'single'; userId: string; name: string }
    | { type: 'bulk'; count: number }
    | null
  >(null);
  const [isRemoving, setIsRemoving] = useState(false);
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

  const confirmRemove = async () => {
    if (!removePending) return;
    try {
      setIsRemoving(true);
      setError('');
      if (removePending.type === 'single') {
        await removeLibraryMember(libraryId, removePending.userId);
        const updatedMembers = await fetchLibraryMembers(libraryId);
        setMembers(updatedMembers);
        setSelectedMembers((prev) => {
          const next = new Set(prev);
          next.delete(removePending.userId);
          return next;
        });
      } else {
        await removeMultipleLibraryMembers(
          libraryId,
          Array.from(selectedMembers)
        );
        const updatedMembers = await fetchLibraryMembers(libraryId);
        setMembers(updatedMembers);
        setSelectedMembers(new Set());
      }
      setRemovePending(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to remove member(s)'
      );
    } finally {
      setIsRemoving(false);
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
              Library Settings
            </h1>
            <p className="text-muted-foreground">Manage library settings</p>
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
          {canManageMembers && (
            <RenameLibraryForm
              libraryId={libraryId}
              initialName={libraryName}
            />
          )}

          {currentUserRole === 'OWNER' && (
            <DeleteLibraryForm
              libraryId={libraryId}
              libraryName={libraryName || 'this library'}
            />
          )}
        </>
      )}

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog
        open={!!removePending}
        onOpenChange={(open) => {
          if (!open && !isRemoving) {
            setRemovePending(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removePending?.type === 'bulk'
                ? `Remove ${removePending.count} member(s)?`
                : 'Remove Member?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removePending?.type === 'bulk' ? (
                <>
                  You are about to remove{' '}
                  <span className="text-foreground font-semibold">
                    {removePending.count} member(s)
                  </span>{' '}
                  from this library. They will immediately lose access. This
                  action cannot be undone.
                </>
              ) : (
                <>
                  You are about to remove{' '}
                  <span className="text-foreground font-semibold">
                    {removePending?.name}
                  </span>{' '}
                  from this library. They will immediately lose access. This
                  action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isRemoving}
              onClick={(e) => {
                e.preventDefault();
                confirmRemove();
              }}
            >
              {isRemoving ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

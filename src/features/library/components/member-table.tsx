'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  updateLibraryMemberRole,
  removeLibraryMember,
  removeMultipleLibraryMembers,
} from '@/features/library/actions';
import { LibraryMember } from '@/features/library/library-schema';
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from '@/components/reui/data-grid/data-grid';
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination';
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area';
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header';
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from '@/components/reui/data-grid/data-grid-table';
import type {
  ColumnDef,
  PaginationState,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table';
import { useTable } from '@tanstack/react-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CheckIcon, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { getLibraryMembers } from '../queries';

interface MemberTableProps {
  libraryId: string;
  canManageMembers: boolean;
}

type MemberRole = 'ADMIN' | 'EDITOR' | 'VIEWER';
const roleOptions = [
  {
    value: 'ADMIN',
    label: 'Admin',
  },
  {
    value: 'EDITOR',
    label: 'Editor',
  },
  {
    value: 'VIEWER',
    label: 'Viewer',
  },
];

// Utility that returns 2-letter initials from a name or email.
const makeInitials = (displayName: string | null, email: string): string => {
  const source = displayName || email.split('@')[0];
  return source
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function MemberTable({ libraryId, canManageMembers }: MemberTableProps) {
  const [members, setMembers] = useState<LibraryMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const prefersReducedMotion = useReducedMotion();
  const selectedMemberIds = Object.keys(rowSelection).filter((userId) =>
    members.some(
      (member) => member.user_id === userId && member.role !== 'OWNER'
    )
  );

  useEffect(() => {
    // Always reset fetch, update, and feedback states on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMembers([]);
    setIsLoading(true);
    setIsUpdating(false);
    setError('');
    setSuccess('');
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const fetchLibraryMembers = async () => {
      try {
        const _members = await getLibraryMembers(libraryId, supabase);
        setMembers(_members);
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError((err as any)?.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLibraryMembers();
  }, [libraryId]);

  const handleRoleChange = useCallback(
    async (userId: string, newRole: MemberRole) => {
      try {
        setIsUpdating(true);
        setError('');

        // Perform the API call
        await updateLibraryMemberRole(libraryId, userId, newRole);

        // Use functional update to avoid needing 'members' in the dependency array
        // Use .map() to ensure immutability (creates a new array/object)
        setMembers((prevMembers) =>
          prevMembers.map((m) =>
            m.user_id === userId ? { ...m, role: newRole } : m
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update role');
      } finally {
        setIsUpdating(false);
      }
    },
    [libraryId]
  );

  const handleRemoveMember = useCallback(
    async (userId: string) => {
      // Save current state in case we need to roll back
      const previousMembers = members;
      const previousSelection = rowSelection;

      try {
        setIsUpdating(true);
        setError('');
        setSuccess('');

        // OPTIMISTIC UPDATE: Update UI immediately
        setMembers((current) => current.filter((m) => m.user_id !== userId));
        setRowSelection((prev) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [userId]: _, ...rest } = prev;
          return rest;
        });

        // Perform the actual API call
        await removeLibraryMember(libraryId, userId);

        setSuccess('Member removed successfully');
      } catch (err) {
        // ROLLBACK: If the API fails, restore the old state
        setMembers(previousMembers);
        setRowSelection(previousSelection);

        setError(
          err instanceof Error ? err.message : 'Failed to remove member'
        );
      } finally {
        setIsUpdating(false);
      }
    },
    [libraryId, members, rowSelection] // Note: Now we need these in dependencies for the rollback
  );

  const handleRemoveMultiple = useCallback(
    async (idsToRemove: string[]) => {
      // Guard clause
      if (idsToRemove.length === 0) return;

      try {
        setIsUpdating(true);
        setError('');
        setSuccess('');

        // API Call
        await removeMultipleLibraryMembers(libraryId, idsToRemove);

        // Update Members (Fixes the Stale UI bug)
        setMembers((current) =>
          current.filter((member) => !idsToRemove.includes(member.user_id))
        );

        // Clear Selection
        setRowSelection({});

        setSuccess('Members removed successfully');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to remove members'
        );
      } finally {
        setIsUpdating(false);
      }
    },
    [libraryId]
  );

  const columns = useMemo<ColumnDef<DataGridFeatures, LibraryMember>[]>(() => {
    const allColumns: ColumnDef<DataGridFeatures, LibraryMember>[] = [
      {
        id: 'select',
        header: () => (canManageMembers ? <DataGridTableRowSelectAll /> : null),
        cell: ({ row }) =>
          canManageMembers ? <DataGridTableRowSelect row={row} /> : null,
        enableSorting: false,
        enableHiding: false,
        size: canManageMembers ? 48 : 0,
        meta: {
          skeleton: <Skeleton className={`h-4 w-4`} />,
        },
      },
      {
        id: 'name',
        accessorFn: (member) => member.user?.name ?? '',
        header: ({ column }) => (
          <DataGridColumnHeader title="Name" column={column} />
        ),
        cell: ({ row }) => {
          const member = row.original;
          const initials = makeInitials(
            member.user?.name || null,
            member.user?.email || ''
          );
          const shouldUseAvatarUrl =
            member.user?.use_avatar_url && member.user?.avatar_url;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                {shouldUseAvatarUrl && (
                  <AvatarImage
                    src={member.user?.avatar_url || ''}
                    alt={member.user?.name || 'Avatar'}
                  />
                )}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-px">
                <div className="text-foreground font-medium">
                  {member.user?.name || 'Unknown User'}
                </div>
                <div className="text-muted-foreground">
                  {member.user?.email || ''}
                </div>
              </div>
            </div>
          );
        },
        size: 220,
        enableSorting: true,
        sortFn: 'alphanumeric',
        meta: {
          skeleton: (
            <div className="flex h-[41px] items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ),
        },
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => {
          const member = row.original;
          if (canManageMembers && member.role !== 'OWNER') {
            return (
              <DropdownMenu disabled={isUpdating}>
                <DropdownMenuTrigger
                  id="inviteMemberRole"
                  aria-label="Invite member role"
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                    >
                      <span className="min-w-0 truncate">
                        {roleOptions
                          .find((o) => o.value === member.role)
                          ?.label?.trim() || 'Select a role'}
                      </span>
                      <ChevronDown data-icon="inline-end" />
                    </Button>
                  }
                />

                <DropdownMenuContent align="start">
                  <DropdownMenuGroup>
                    {roleOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() =>
                          handleRoleChange(
                            member.user_id,
                            option.value as MemberRole
                          )
                        }
                        disabled={option.value === member.role}
                        className="flex justify-between"
                      >
                        <span>{option.label}</span>
                        <span>
                          {option.value === member.role && <CheckIcon />}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          return (
            <div>
              <span className="font-medium">{member.role}</span>
              {member.role === 'OWNER' && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Library creator
                </p>
              )}
            </div>
          );
        },
        size: 150,
        meta: {
          skeleton: <Skeleton className="h-7 w-28" />,
        },
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => (
          <DataGridColumnHeader title="Joined" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {new Date(row.original.created_at).toLocaleDateString()}
          </span>
        ),
        size: 120,
        enableSorting: true,
        sortFn: 'datetime',
        meta: {
          skeleton: <Skeleton className="h-7 w-28" />,
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const member = row.original;
          if (!canManageMembers || member.role === 'OWNER') return null;

          return (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isUpdating}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${member.user?.email}`}
                  >
                    Remove
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove member</AlertDialogTitle>
                  <AlertDialogDescription>
                    Remove <strong>{member.user?.email}</strong> from this
                    library? They will lose all access.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleRemoveMember(member.user_id)}
                    variant="destructive"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          );
        },
        enableSorting: false,
        enableHiding: false,
        size: 110,
        meta: {
          skeleton: <Skeleton className="h-7 w-16" />,
        },
      },
    ];

    return canManageMembers ? allColumns : allColumns.slice(1, -1);
  }, [canManageMembers, handleRemoveMember, handleRoleChange, isUpdating]);

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: members,
    getRowId: (member) => member.user_id,
    pageCount: Math.ceil(members.length / pagination.pageSize),
    state: { pagination, rowSelection, sorting },
    enableRowSelection: (row) =>
      canManageMembers && row.original.role !== 'OWNER',
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Members</h2>

            {isLoading ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              <p className="text-muted-foreground text-sm">
                {members.length} members
              </p>
            )}
          </div>
          {canManageMembers && selectedMemberIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedMemberIds.length === 0 || isUpdating}
              onClick={() => handleRemoveMultiple(selectedMemberIds)}
            >
              Remove {selectedMemberIds.length} member(s)
            </Button>
          )}
        </div>
      </div>

      {error && (
        <motion.div
          className="rounded border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.2,
          }}
        >
          <p className="text-sm text-red-700 dark:text-red-400">
            {error || 'Something went wrong'}
          </p>
        </motion.div>
      )}

      {success && (
        <motion.div
          className="rounded border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.2,
          }}
        >
          <p className="text-sm text-green-700 dark:text-green-400">
            {success}
          </p>
        </motion.div>
      )}

      <DataGrid
        table={table}
        recordCount={members.length}
        emptyMessage="No members yet."
        isLoading={isLoading}
      >
        <div className="w-full space-y-2.5">
          <DataGridContainer>
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
          </DataGridContainer>
          <DataGridPagination />
        </div>
      </DataGrid>
    </Card>
  );
}

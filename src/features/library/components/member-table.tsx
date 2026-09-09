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

interface MemberTableProps {
  libraryId: string;
  members: LibraryMember[];
  canManageMembers: boolean;
}

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

export function MemberTable({
  libraryId,
  members,
  canManageMembers,
}: MemberTableProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const prefersReducedMotion = useReducedMotion();
  const selectedMemberIds = Object.keys(rowSelection).filter((userId) =>
    members.some(
      (member) => member.user_id === userId && member.role !== 'OWNER'
    )
  );

  // This reset all the component states function
  const resetState = useCallback(() => {
    setIsUpdating(false);
    setError('');
    setSuccess('');
  }, []);

  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  const handleRoleChange = useCallback(
    async (userId: string, newRole: string) => {
      try {
        setIsUpdating(true);
        setError('');
        await updateLibraryMemberRole(
          libraryId,
          userId,
          newRole as 'ADMIN' | 'EDITOR' | 'VIEWER'
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
      try {
        setIsUpdating(true);
        setError('');
        setSuccess('');
        await removeLibraryMember(libraryId, userId);
        setRowSelection((previous) => {
          const next = { ...previous };
          delete next[userId];
          return next;
        });
        setSuccess('Member removed successfully');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to remove member'
        );
      } finally {
        setIsUpdating(false);
      }
    },
    [libraryId]
  );

  const handleRemoveMultiple = async () => {
    if (selectedMemberIds.length === 0) return;
    try {
      setIsUpdating(true);
      setError('');
      await removeMultipleLibraryMembers(libraryId, selectedMemberIds);
      setRowSelection({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove members');
    } finally {
      setIsUpdating(false);
    }
  };

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
                          handleRoleChange(member.user_id, option.value)
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
            <p className="text-muted-foreground text-sm">
              {members.length} members
            </p>
          </div>
          {canManageMembers && selectedMemberIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              disabled={isUpdating}
              onClick={handleRemoveMultiple}
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
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
        >
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          className="rounded border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
        >
          <p className="text-sm text-green-700 dark:text-green-400">
            {success}
          </p>
        </motion.div>
      )}

      {members.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">No members yet</p>
        </div>
      ) : (
        <DataGrid table={table} recordCount={members.length}>
          <div className="w-full space-y-2.5">
            <DataGridContainer>
              <DataGridScrollArea>
                <DataGridTable />
              </DataGridScrollArea>
            </DataGridContainer>
            <DataGridPagination />
          </div>
        </DataGrid>
      )}
    </Card>
  );
}

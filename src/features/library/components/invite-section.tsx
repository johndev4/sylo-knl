'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  createLibraryInvite,
  revokeLibraryInvite,
} from '@/features/library/actions';

import { getURL } from '@/lib/auth/utils';
import { Invite } from '@/features/library/library-schema';
import { Card } from '@/components/ui/card';
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from '@/components/reui/data-grid/data-grid';
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination';
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area';
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header';
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table';
import {
  ColumnDef,
  PaginationState,
  SortingState,
  useTable,
} from '@tanstack/react-table';

interface InviteSectionProps {
  libraryId: string;
  initialInvites: Invite[];
}

const roleOptions = [
  {
    value: 'EDITOR',
    label: 'Editor - Can create and edit content',
  },
  {
    value: 'VIEWER',
    label: 'Viewer - Can view content only',
  },
];

export function InviteSection({
  libraryId,
  initialInvites,
}: InviteSectionProps) {
  const [invites, setInvites] = useState(initialInvites);

  const [isCreating, setIsCreating] = useState(false);
  const [role, setRole] = useState<'VIEWER' | 'EDITOR'>('VIEWER');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxUses, setMaxUses] = useState('');

  const [inviteToRevoke, setInviteToRevoke] = useState<Invite | null>(null);

  const [isRevoking, setIsRevoking] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const prefersReducedMotion = useReducedMotion();

  // This reset all the component states function
  const resetState = useCallback(() => {
    setIsCreating(false);
    setRole('VIEWER');
    setExpiresAt('');
    setMaxUses('');
    setInviteToRevoke(null);
    setIsRevoking(false);
    setError('');
    setSuccess('');
  }, []);

  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  async function handleCreateInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError('');
    setSuccess('');

    try {
      setIsCreating(true);

      const parsedExpiresAt = expiresAt
        ? new Date(expiresAt).toISOString()
        : null;

      let parsedMaxUses: number | null = null;

      if (maxUses) {
        parsedMaxUses = parseInt(maxUses, 10);

        if (isNaN(parsedMaxUses) || parsedMaxUses <= 0) {
          throw new Error('Max uses must be a positive number');
        }
      }

      const invite = await createLibraryInvite(
        libraryId,
        role,
        parsedExpiresAt,
        parsedMaxUses
      );

      setInvites((current) => [...current, invite]);

      setSuccess('Invite created successfully');
      setRole('VIEWER');
      setExpiresAt('');
      setMaxUses('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setIsCreating(false);
    }
  }

  async function confirmRevoke() {
    if (!inviteToRevoke) {
      return;
    }

    try {
      setIsRevoking(true);
      setError('');
      setSuccess('');

      await revokeLibraryInvite(libraryId, inviteToRevoke.id);

      setInvites((current) =>
        current.filter((invite) => invite.id !== inviteToRevoke.id)
      );

      setInviteToRevoke(null);
      setSuccess('Invite revoked successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invite');
    } finally {
      setIsRevoking(false);
    }
  }

  async function handleCopyLink(code: string) {
    const origin = getURL();
    const url = `${origin}/join/${code}`;

    await navigator.clipboard.writeText(url);

    setSuccess('Invite link copied to clipboard');

    setTimeout(() => {
      setSuccess('');
    }, 3000);
  }

  const columns = useMemo<ColumnDef<DataGridFeatures, Invite>[]>(
    () => [
      {
        accessorKey: 'invite_code',
        header: 'Code',
        cell: ({ row }) => (
          <span className="font-mono">{row.original.invite_code}</span>
        ),
        size: 160,
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => row.original.role,
        size: 120,
      },
      {
        accessorKey: 'use_count',
        header: 'Uses',
        cell: ({ row }) => {
          const invite = row.original;
          return `${invite.use_count} / ${invite.max_uses || '∞'}`;
        },
        size: 100,
      },
      {
        accessorKey: 'expires_at',
        header: ({ column }) => (
          <DataGridColumnHeader title="Expires" column={column} />
        ),
        cell: ({ row }) => (
          <span>
            {row.original.expires_at
              ? new Date(row.original.expires_at).toLocaleString()
              : 'Never'}
          </span>
        ),
        size: 180,
        enableSorting: true,
        sortFn: 'datetime',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const invite = row.original;
          return (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyLink(invite.invite_code)}
              >
                Copy
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setInviteToRevoke(invite)}
              >
                Revoke
              </Button>
            </div>
          );
        },
        size: 150,
      },
    ],
    []
  );

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: invites,
    getRowId: (invite) => invite.id,
    pageCount: Math.ceil(invites.length / pagination.pageSize),
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Invite Links</h2>
        <p className="text-muted-foreground text-sm">
          Create shareable links to invite multiple users to your library.
        </p>
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
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
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

      {/* Generate Invite Link Form */}
      <form
        onSubmit={handleCreateInvite}
        className="bg-muted/20 space-y-4 overflow-x-auto rounded-md border p-4"
      >
        <h3 className="font-medium">Generate New Invite</h3>

        <div className="flex flex-wrap gap-2.5">
          <div>
            <Label htmlFor="inviteMemberRole" className="text-sm font-medium">
              Role
            </Label>

            <Select
              value={role}
              onValueChange={(value) => {
                if (value) setRole(value as 'VIEWER' | 'EDITOR');
              }}
              disabled={isCreating}
            >
              <SelectTrigger
                id="inviteMemberRole"
                className="mt-1"
                aria-label="Invite member role"
              >
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>

              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="expiresAt" className="text-sm font-medium">
              Expiration (Optional)
            </Label>

            <Input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={isCreating}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="maxUses" className="text-sm font-medium">
              Max Uses (Optional)
            </Label>

            <Input
              id="maxUses"
              type="number"
              min="1"
              placeholder="Unlimited"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              disabled={isCreating}
              className="mt-1"
            />
          </div>
        </div>

        <Button type="submit" disabled={isCreating}>
          {isCreating ? 'Generating...' : 'Generate Invite Link'}
        </Button>
      </form>

      <div className="mt-6" aria-label="Active Invites section">
        <h3 className="mb-4 font-medium" id="active-invites-heading">
          Active Invites
        </h3>

        {invites.length === 0 ? (
          <p className="text-muted-foreground text-sm">No active invites.</p>
        ) : (
          <DataGrid table={table} recordCount={invites.length || 0}>
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
      </div>

      <AlertDialog
        open={!!inviteToRevoke}
        onOpenChange={(open) => {
          if (!open && !isRevoking) {
            setInviteToRevoke(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invite Link?</AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you want to revoke the invite code{' '}
              <span className="text-foreground font-mono font-semibold">
                {inviteToRevoke?.invite_code}
              </span>
              ? Users will no longer be able to use this link to join the
              library. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>

            <AlertDialogAction
              variant="destructive"
              disabled={isRevoking}
              onClick={(e) => {
                e.preventDefault();
                confirmRevoke();
              }}
            >
              {isRevoking ? 'Revoking...' : 'Revoke Invite'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

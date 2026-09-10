'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
import { CheckIcon, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { createClient } from '@/lib/supabase/client';
import { getLibraryInvites } from '../queries';

interface InviteSectionProps {
  libraryId: string;
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

export function InviteSection({ libraryId }: InviteSectionProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [inviteToRevoke, setInviteToRevoke] = useState<Invite | null>(null);

  const [role, setRole] = useState<'VIEWER' | 'EDITOR'>('VIEWER');
  const [expiresAt, setExpiresAt] = useState('');
  const [expiryOption, setExpiryOption] = useState<
    'never' | '24h' | '7d' | '30d' | 'custom'
  >('never');
  const [maxUses, setMaxUses] = useState('');

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Always reset states on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInvites([]);
    setIsLoading(true);
    setIsCreating(false);
    setRole('VIEWER');
    setExpiresAt('');
    setExpiryOption('never');
    setMaxUses('');
    setInviteToRevoke(null);
    setIsRevoking(false);
    setError('');
    setSuccess('');
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const fetchLibraryInvites = async () => {
      try {
        const _invites = await getLibraryInvites(libraryId, supabase);
        setInvites(_invites);
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError((err as any)?.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLibraryInvites();
  }, [libraryId]);

  const columns = useMemo<ColumnDef<DataGridFeatures, Invite>[]>(
    () => [
      {
        accessorKey: 'invite_code',
        header: 'Code',
        cell: ({ row }) => (
          <span className="font-mono">{row.original.invite_code}</span>
        ),
        size: 160,
        meta: { skeleton: <Skeleton className="h-7 w-24" /> },
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => row.original.role,
        size: 120,
        meta: { skeleton: <Skeleton className="h-7 w-24" /> },
      },
      {
        accessorKey: 'use_count',
        header: 'Uses',
        cell: ({ row }) => {
          const invite = row.original;
          return `${invite.use_count} / ${invite.max_uses || '∞'}`;
        },
        size: 100,
        meta: { skeleton: <Skeleton className="h-7 w-24" /> },
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
        meta: { skeleton: <Skeleton className="h-7 w-24" /> },
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
        meta: {
          skeleton: (
            <div className="flex flex-row gap-1">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-7 w-16" />
            </div>
          ),
        },
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
    autoResetPageIndex: false,
  });

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

      setInvites((current) => [invite, ...current]);

      setSuccess('Invite created successfully');
      setRole('VIEWER');
      setExpiresAt('');
      setExpiryOption('never');
      setMaxUses('');
      table.resetPageIndex();
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

      <div aria-live="polite" aria-atomic="true">
        {
          // Accessible feedback region for invite form
          // Wrapper <div aria-live="polite" aria-atomic="true">
          // - aria-live="polite": screen readers announce changes politely
          // - aria-atomic="true": read entire region on update
          //
          // Children:
          // - error banner (red, slides in on failure)
          // - success banner (green, slides in on success)
          //
          // Purpose: ensures async updates (API responses) are announced.
          // Motion respects prefersReducedMotion (duration=0 if enabled).
        }
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
      </div>

      {/* Generate Invite Link Form */}
      <form
        onSubmit={handleCreateInvite}
        className="bg-muted/20 space-y-4 rounded-md border p-4"
      >
        <h3 className="font-medium">Generate New Invite</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inviteMemberRole" className="text-sm font-medium">
              Role
            </Label>

            <DropdownMenu disabled={isCreating}>
              <DropdownMenuTrigger
                id="inviteMemberRole"
                className="border-input focus-visible:ring-ring/50 flex h-9 w-full items-center justify-between gap-1.5 rounded-md border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-1"
                aria-label="Invite member role"
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                  >
                    <span className="min-w-0 truncate">
                      {roleOptions
                        .find((o) => o.value === role)
                        ?.label?.split('-')?.[0]
                        ?.trim() || 'Select a role'}
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
                        setRole(option.value as 'VIEWER' | 'EDITOR')
                      }

                      className="flex justify-between"
                    >
                      <span>{option.label}</span>
                      <span>{option.value === role && <CheckIcon />}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Expires in */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expiresIn" className="text-sm font-medium">
              Expires in
            </Label>

            <DropdownMenu disabled={isCreating}>
              <DropdownMenuTrigger
                id="expiresIn"
                className="border-input focus-visible:ring-ring/50 flex h-9 w-full items-center justify-between gap-1.5 rounded-md border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-1"
                aria-label="Invite expiry duration"
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                  >
                    <span className="min-w-0 truncate">
                      {expiryOption === 'never' && 'Never'}
                      {expiryOption === '24h' && '24 hours'}
                      {expiryOption === '7d' && '7 days'}
                      {expiryOption === '30d' && '30 days'}
                      {expiryOption === 'custom' && 'Custom'}
                    </span>
                    <ChevronDown data-icon="inline-end" />
                  </Button>
                }
              />

              <DropdownMenuContent align="start">
                <DropdownMenuGroup>
                  {[
                    { key: 'never', label: 'Never' },
                    { key: '24h', label: '24 hours' },
                    { key: '7d', label: '7 days' },
                    { key: '30d', label: '30 days' },
                    { key: 'custom', label: 'Custom' },
                  ].map(({ key, label }) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => {
                        const opt = key as typeof expiryOption;
                        setExpiryOption(opt);
                        if (opt === 'never') {
                          setExpiresAt('');
                        } else if (opt === '24h') {
                          const d = new Date();
                          d.setHours(d.getHours() + 24);
                          setExpiresAt(d.toISOString());
                        } else if (opt === '7d') {
                          const d = new Date();
                          d.setDate(d.getDate() + 7);
                          setExpiresAt(d.toISOString());
                        } else if (opt === '30d') {
                          const d = new Date();
                          d.setDate(d.getDate() + 30);
                          setExpiresAt(d.toISOString());
                        } else {
                          // custom: clear and let DatePicker set it
                          setExpiresAt('');
                        }
                      }}
                      className="flex justify-between"
                    >
                      <span>{label}</span>
                      <span>{key === expiryOption && <CheckIcon />}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {expiryOption === 'custom' && (
              <DatePicker
                disabled={isCreating}
                placeholder="Pick expiry date"
                value={expiresAt ? new Date(expiresAt) : undefined}
                onChange={(date) =>
                  setExpiresAt(date ? date.toISOString() : '')
                }
                className="mt-1 w-full"
              />
            )}
          </div>

          {/* Max uses (Optional) */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="maxUses" className="text-sm font-medium">
              Max uses{' '}
              <span className="text-muted-foreground font-normal">
                (Optional)
              </span>
            </Label>

            <Input
              id="maxUses"
              type="number"
              min="1"
              placeholder="Unlimited"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              disabled={isCreating}
              autoComplete="off"
            />
          </div>
        </div>

        <Button type="submit" disabled={isCreating}>
          {'Generate Invite Link'}
          {isCreating && <Spinner className="size-3.5" />}
        </Button>
      </form>

      <div className="mt-6" aria-label="Active Invites section">
        <h3 className="mb-4 font-medium" id="active-invites-heading">
          Active Invites
        </h3>

        <DataGrid
          table={table}
          recordCount={invites.length || 0}
          emptyMessage="No active invites."
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
              {'Revoke Invite'}
              {isRevoking && <Spinner className="size-3.5" />}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

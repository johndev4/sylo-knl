'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion';
import {
  LogOut,
  AlertTriangle,
  Loader2,
  FileText,
  MessageSquare,
  MoreHorizontal,
  LucideSettings2,
} from 'lucide-react';
import { useState } from 'react';
import { leaveLibrary } from '@/lib/actions/libraries';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Membership = {
  role: string;
  library: { id: string; name: string; created_at: string };
  memberCount: number;
  docCount: number;
};

interface LibrariesTableProps {
  memberships: Membership[];
}

// Simple date formatter
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

export function LibrariesTable({ memberships }: LibrariesTableProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [leaveId, setLeaveId] = useState<string | null>(null);
  const [leaveName, setLeaveName] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const rowVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.35,
        ease: 'easeOut' as const,
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: { duration: prefersReducedMotion ? 0 : 0.25 },
    },
  };

  const handleLeaveConfirm = async () => {
    if (!leaveId) return;
    setIsLeaving(true);
    setLeaveError(null);
    try {
      await leaveLibrary(leaveId);
      setLeaveId(null);
      setLeaveName(null);
      setIsAlertOpen(false);
      router.refresh();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setLeaveError(err.message || 'Failed to leave library. Try again.');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleOpenLeaveDialog = (libraryId: string, libraryName: string) => {
    setLeaveId(libraryId);
    setLeaveName(libraryName);
    setLeaveError(null);
    setIsAlertOpen(true);
  };

  const handleCloseLeaveDialog = () => {
    if (!isLeaving) {
      setIsAlertOpen(false);
      setLeaveId(null);
      setLeaveName(null);
      setLeaveError(null);
    }
  };

  // const handleRowClick = (id: string) => {
  //   router.push(`/hub/libraries/${id}/documents`); // navigate to another page
  // };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300';
      case 'ADMIN':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300';
      case 'EDITOR':
        return 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300';
      case 'VIEWER':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  /* ── Leave confirmation alert dialog ── */
  return (
    <>
      <div className="w-full overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <th className="px-4 py-3 text-left font-semibold">Library</th>
              <th className="px-4 py-3 text-left font-semibold">Your Role</th>
              <th className="px-4 py-3 text-center font-semibold">Members</th>
              <th className="px-4 py-3 text-center font-semibold">Documents</th>
              <th className="px-4 py-3 text-left font-semibold">Created</th>
              <th className="px-4 py-3 text-right font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {memberships.map((membership) => {
                const library = membership.library;
                const space = library;
                const isOwner = membership.role === 'OWNER';
                const isAdmin = membership.role === 'ADMIN';
                return (
                  <motion.tr
                    key={library.id}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className="border-b border-zinc-200 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-4 py-3 font-medium">{library.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${getRoleBadgeColor(membership.role)}`}
                      >
                        {membership.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">
                      {membership.memberCount}
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">
                      {membership.docCount}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                      {formatRelativeDate(library.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          asChild
                          variant="default"
                          size="sm"
                          aria-label={`Open chat for ${space.name}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/hub/chat?libraryId=${space.id}`}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Chat
                          </Link>
                        </Button>

                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          aria-label={`View documents for ${space.name}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/hub/libraries/${space.id}/documents`}>
                            <FileText className="mr-2 h-4 w-4" />
                            Docs
                          </Link>
                        </Button>

                        {/* Library Dropdown Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="More options"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(isOwner || isAdmin) && (
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/hub/libraries/${space.id}/settings`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-2"
                                >
                                  <LucideSettings2 className="h-4 w-4" />
                                  Settings
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {!isOwner && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleOpenLeaveDialog(
                                    library.id,
                                    library.name
                                  )
                                }
                                className="flex items-center gap-2 text-orange-600 focus:text-orange-600 dark:text-orange-400"
                              >
                                <LogOut className="h-4 w-4" />
                                Leave
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Leave Library Alert Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={handleCloseLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <AlertDialogTitle>Leave Library?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer have access to{' '}
              <span className="text-foreground font-semibold">
                &quot;{leaveName}&quot;
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
            {leaveError && (
              <p className="pt-2 text-xs font-medium text-red-600 dark:text-red-400">
                {leaveError}
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLeaveConfirm}
            disabled={isLeaving}
            className="bg-orange-600 text-white hover:bg-orange-700"
          >
            {isLeaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Leaving...
              </>
            ) : (
              'Leave Library'
            )}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

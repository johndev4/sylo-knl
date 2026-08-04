'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion';
import { FileText, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const prefersReducedMotion = useReducedMotion();

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
                const space = membership.library;

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
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </>
  );
}

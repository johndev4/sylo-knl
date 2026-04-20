'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, AlertTriangle, Loader2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { leaveWorkspace } from '@/lib/actions/workspaces';

type Membership = {
  role: string;
  workspace: { id: string; name: string; created_at: string };
  memberCount: number;
  docCount: number;
};

interface WorkspacesTableProps {
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

export function WorkspacesTable({ memberships }: WorkspacesTableProps) {
  const router = useRouter();
  const [leaveId, setLeaveId] = useState<string | null>(null);
  const [leaveName, setLeaveName] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleLeaveConfirm = async () => {
    if (!leaveId) return;
    setIsLeaving(true);
    setLeaveError(null);
    try {
      await leaveWorkspace(leaveId);
      setLeaveId(null);
      setLeaveName(null);
      router.refresh();
    } catch (err: any) {
      setLeaveError(err.message || 'Failed to leave workspace. Try again.');
    } finally {
      setIsLeaving(false);
    }
  };

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

  /* ── Leave confirmation modal ── */
  const leaveModal = leaveId && (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-md animate-in fade-in duration-300"
        onClick={() => !isLeaving && setLeaveId(null)}
      />

      {/* Panel */}
      <div className="relative bg-white dark:bg-zinc-950 w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="p-6">
          <button
            onClick={() => !isLeaving && setLeaveId(null)}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            disabled={isLeaving}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4 text-zinc-500" />
          </button>

          <div className="flex items-start gap-4 mb-5">
            <div className="shrink-0 rounded-full bg-orange-100 dark:bg-orange-950/60 p-2.5">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 id="leave-dialog-title" className="text-lg font-bold tracking-tight">
                Leave Workspace?
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                You will no longer have access to{' '}
                <span className="font-semibold text-foreground">"{leaveName}"</span>. This action cannot be undone.
              </p>
            </div>
          </div>

          {leaveError && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-4">
              {leaveError}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setLeaveId(null)}
              disabled={isLeaving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1 bg-orange-600 text-white hover:bg-orange-700"
              onClick={handleLeaveConfirm}
              disabled={isLeaving}
            >
              {isLeaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Leaving...</>
              ) : (
                'Leave Workspace'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="w-full overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="px-4 py-3 text-left font-semibold">Workspace</th>
              <th className="px-4 py-3 text-left font-semibold">Your Role</th>
              <th className="px-4 py-3 text-center font-semibold">Members</th>
              <th className="px-4 py-3 text-center font-semibold">Documents</th>
              <th className="px-4 py-3 text-left font-semibold">Created</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((membership) => {
              const space = membership.workspace;
              const isOwner = membership.role === 'OWNER';
              return (
                <tr key={space.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{space.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(membership.role)}`}>
                      {membership.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">{membership.memberCount}</td>
                  <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">{membership.docCount}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">
                    {formatRelativeDate(space.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/spaces/${space.id}/chat`}>
                        <Button size="sm" variant="default">Chat</Button>
                      </Link>
                      {isOwner && (
                        <Link href={`/spaces/${space.id}/settings`}>
                          <button
                            className="p-2 rounded-md text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                            aria-label={`Manage settings for ${space.name}`}
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                        </Link>
                      )}
                      {!isOwner && (
                        <button
                          onClick={() => {
                            setLeaveId(space.id);
                            setLeaveName(space.name);
                            setLeaveError(null);
                          }}
                          className="p-2 rounded-md text-zinc-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors cursor-pointer"
                          aria-label={`Leave ${space.name}`}
                        >
                          <LogOut className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {mounted && leaveModal && createPortal(leaveModal, document.body)}
    </>
  );
}

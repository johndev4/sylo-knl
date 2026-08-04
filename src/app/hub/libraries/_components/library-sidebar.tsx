'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  PanelLeftClose,
  PanelLeft,
  Grid,
  ChevronLeft,
  LogOut,
  AlertTriangle,
  Loader2,
  Target,
  Settings,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSidebarRefresh } from '../[id]/documents/_components';
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
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { leaveLibrary } from '@/lib/actions/libraries';

export function LibrarySidebar() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const libraryId = params?.id as string;

  const [isOpen, setIsOpen] = useState(true);
  const [library, setLibrary] = useState<{ name: string } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const { refreshKey } = useSidebarRefresh();

  const fetchLibrary = useCallback(async () => {
    if (!libraryId) return;
    try {
      const res = await fetch(`/api/libraries/${libraryId}`);
      if (res.ok) {
        const data = await res.json();
        setLibrary(data.library);
        setRole(data.role);
      }
    } catch (error) {
      console.error('Failed to fetch library:', error);
    }
  }, [libraryId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchLibrary();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchLibrary, refreshKey]);

  const handleOpenLeaveDialog = () => {
    setLeaveError(null);
    setIsLeaveDialogOpen(true);
  };

  const handleCloseLeaveDialog = () => {
    if (!isLeaving) {
      setIsLeaveDialogOpen(false);
      setLeaveError(null);
    }
  };

  const handleLeaveConfirm = async () => {
    if (!libraryId) return;

    setIsLeaving(true);
    setLeaveError(null);

    try {
      await leaveLibrary(libraryId);
      setIsLeaveDialogOpen(false);
      router.push('/hub');
      router.refresh();
    } catch (error) {
      setLeaveError(
        error instanceof Error
          ? error.message
          : 'Failed to leave library. Please try again.'
      );
    } finally {
      setIsLeaving(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="sticky top-0 flex h-[calc(100vh-4.1rem)] w-16 shrink-0 flex-col items-center border-r border-zinc-200/10 bg-zinc-50 py-4 transition-all duration-300 dark:border-zinc-800/20 dark:bg-[#09090b]">
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
          <PanelLeft className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  const canManageLibrarySettings = ['OWNER', 'ADMIN'].includes(role ?? '');
  const isOwner = role === 'OWNER';

  return (
    <Sidebar className="sticky top-0 flex h-[calc(100vh-4.1rem)] w-72 shrink-0 flex-col border-r border-zinc-200/10 bg-zinc-50 transition-all duration-300 dark:border-zinc-800/20 dark:bg-[#09090b]">
      {/* Header */}
      <SidebarHeader className="flex items-center justify-between border-b border-zinc-200/10 p-4 dark:border-zinc-800/20">
        <div className="mr-2 flex flex-1 flex-col gap-0.5 overflow-hidden">
          <span className="text-muted-foreground/50 text-[10px] font-bold tracking-widest uppercase">
            Library
          </span>
          <div className="text-foreground flex items-center gap-1.5 truncate text-xs font-bold">
            <Grid className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            {library ? (
              <span className="truncate">{library.name}</span>
            ) : (
              <Skeleton className="h-4 w-24" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Sidebar Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsOpen(false)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex shrink-0 flex-col gap-1 bg-inherit p-4">
        {libraryId &&
          (library ? (
            <SidebarMenu>
              {/* Back to Documents Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="text-sm font-semibold"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    href={`/hub/libraries/${libraryId}/documents`}
                    className="relative flex w-full items-center justify-center"
                  >
                    <ChevronLeft className="absolute left-1 h-5 w-5" />
                    Manage Documents
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Overview Menu Item */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === `/hub/libraries/${libraryId}/overview`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link href={`/hub/libraries/${libraryId}/overview`}>
                    <Target className="mr-2 h-4 w-4" />
                    Overview
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* Settings Menu Item */}
              {canManageLibrarySettings && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.includes(
                      `/hub/libraries/${libraryId}/settings`
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link href={`/hub/libraries/${libraryId}/settings`}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {/* Members Menu Item */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname?.includes(
                    `/hub/libraries/${libraryId}/members`
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link href={`/hub/libraries/${libraryId}/members`}>
                    <Users className="mr-2 h-4 w-4" />
                    Members
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Leave Library Button */}
              {!isOwner && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenLeaveDialog();
                    }}
                  >
                    <button type="button" className="flex w-full items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      Leave Library
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          ) : (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
      </SidebarContent>

      {/* Leave Library Alert Dialog */}
      <AlertDialog
        open={isLeaveDialogOpen}
        onOpenChange={handleCloseLeaveDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <AlertDialogTitle>Leave Library?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer have access to{' '}
              <span className="text-foreground font-semibold">
                &quot;{library?.name ?? 'this library'}&quot;
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
            {leaveError && (
              <p className="pt-2 text-xs font-medium text-red-600 dark:text-red-400">
                {leaveError}
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
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
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}

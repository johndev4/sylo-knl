'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  LogOut,
  AlertTriangle,
  Loader2,
  Target,
  Settings,
  Users,
  Library,
} from 'lucide-react';
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
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { leaveLibrary } from '@/lib/actions/libraries';

export function LibrarySidebar() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const libraryId = params?.id as string;

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

  const canManageLibrarySettings = ['OWNER', 'ADMIN'].includes(role ?? '');
  const isOwner = role === 'OWNER';

  return (
    <Sidebar
      collapsible="icon"
      className="top-[4.1rem] h-[calc(100vh-4.1rem)]"
      aria-label="Library Sidebar"
    >
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex min-w-0 items-center justify-between gap-2 p-0 group-data-[collapsible=icon]:justify-center">
              <div className="flex min-w-0 items-center gap-2">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg">
                  <Library className="size-4" />
                </div>
                <div className="grid flex-1 overflow-hidden text-left text-xs leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="text-muted-foreground/70 text-[10px] font-bold tracking-wider uppercase">
                    Library
                  </span>
                  <span className="truncate text-sm font-semibold">
                    {library ? library.name : <Skeleton className="h-4 w-24" />}
                  </span>
                </div>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {libraryId &&
              (library ? (
                <SidebarMenu className="gap-1">
                  {/* Back to Documents Button */}
                  <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
                    <SidebarMenuButton
                      asChild
                      tooltip="Manage Documents"
                      className="font-semibold"
                    >
                      <Link
                        href={`/hub/libraries/${libraryId}/documents`}
                        className="relative"
                      >
                        <ChevronLeft className="absolute left-0" />
                        <span className="flex-1 text-center">
                          Manage Documents
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Overview Menu Item */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        pathname === `/hub/libraries/${libraryId}/overview`
                      }
                      tooltip="Overview"
                    >
                      <Link href={`/hub/libraries/${libraryId}/overview`}>
                        <Target />
                        <span>Overview</span>
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
                        tooltip="Settings"
                      >
                        <Link href={`/hub/libraries/${libraryId}/settings`}>
                          <Settings />
                          <span>Settings</span>
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
                      tooltip="Members"
                    >
                      <Link href={`/hub/libraries/${libraryId}/members`}>
                        <Users />
                        <span>Members</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              ) : (
                <div className="space-y-3 p-2">
                  <Skeleton className="h-8 w-full rounded-md" />
                  <Skeleton className="h-8 w-full rounded-md" />
                  <Skeleton className="h-8 w-full rounded-md" />
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>
              ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {!isOwner && library && (
          <SidebarMenu>
            <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
              <SidebarMenuButton
                onClick={handleOpenLeaveDialog}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                tooltip="Leave Library"
              >
                <LogOut />
                <span>Leave Library</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>

      <SidebarRail />

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

'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { leaveLibrary } from '@/features/library/actions';
interface SidebarLibraryNavProps {
  userRole: string;
  libraryName: string;
}

export function SidebarLibraryNav({
  userRole,
  libraryName,
}: SidebarLibraryNavProps) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const libraryId = params?.id as string;

  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

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

  const canManageLibrarySettings = ['OWNER', 'ADMIN'].includes(userRole ?? '');
  const isOwner = userRole === 'OWNER';

  return (
    <>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {libraryId &&
              (libraryName ? (
                <SidebarMenu className="gap-1">
                  {/* Back to Documents Button */}
                  <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
                    <SidebarMenuButton
                      render={
                        <Link
                          href={`/hub/libraries/${libraryId}/documents`}
                          className="relative"
                        >
                          <ChevronLeft className="absolute left-0" />
                          <span className="flex-1 text-center">
                            Manage Documents
                          </span>
                        </Link>
                      }
                      tooltip="Manage Documents"
                      className="font-semibold"
                    />
                  </SidebarMenuItem>

                  {/* Overview Menu Item */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={
                        <Link href={`/hub/libraries/${libraryId}`}>
                          <Target />
                          <span>Overview</span>
                        </Link>
                      }
                      isActive={pathname === `/hub/libraries/${libraryId}`}
                      tooltip="Overview"
                    />
                  </SidebarMenuItem>

                  {/* Settings Menu Item */}
                  {canManageLibrarySettings && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        render={
                          <Link href={`/hub/libraries/${libraryId}/settings`}>
                            <Settings />
                            <span>Settings</span>
                          </Link>
                        }
                        isActive={pathname?.includes(
                          `/hub/libraries/${libraryId}/settings`
                        )}
                        tooltip="Settings"
                      />
                    </SidebarMenuItem>
                  )}

                  {/* Members Menu Item */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={
                        <Link href={`/hub/libraries/${libraryId}/members`}>
                          <Users />
                          <span>Members</span>
                        </Link>
                      }
                      isActive={pathname?.includes(
                        `/hub/libraries/${libraryId}/members`
                      )}
                      tooltip="Members"
                    />
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
        {!isOwner && libraryName && (
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

      {/* <SidebarRail /> */}

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
                &quot;{libraryName ?? 'this library'}&quot;
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
              variant={'destructive'}
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
    </>
  );
}

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Library } from 'lucide-react';
import { Suspense } from 'react';
import { getCachedLibraryName } from '../queries.server';
import { LibrarySidebarContent } from './library-sidebar-content';
import { requireLibraryRole } from '@/lib/auth/library-role';

interface LibrarySidebarProps {
  params: Promise<{ id: string }>;
}

export function LibrarySidebar({ params }: LibrarySidebarProps) {
  return (
    <Suspense fallback={<LibrarySidebarLoading />}>
      <LibrarySidebarAsync params={params} />
    </Suspense>
  );
}

async function LibrarySidebarAsync({ params }: LibrarySidebarProps) {
  const { id: libraryId } = await params;
  const membership = await requireLibraryRole(libraryId);
  if (!membership) return null;

  const libraryName = await getCachedLibraryName(libraryId);
  if (!libraryName) throw new Error('Library not found');

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
                    {libraryName ? (
                      libraryName
                    ) : (
                      <Skeleton className="h-4 w-24" />
                    )}
                  </span>
                </div>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content */}
      <LibrarySidebarContent
        userRole={membership.role}
        libraryName={libraryName}
      />

      {/* <SidebarRail /> */}
    </Sidebar>
  );
}

function LibrarySidebarLoading() {
  return (
    <Sidebar className="top-[4.1rem] h-[calc(100vh-4.1rem)]">
      <div className="space-y-2 p-4">
        <Skeleton className="h-9 w-full rounded" />

        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>

        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </Sidebar>
  );
}

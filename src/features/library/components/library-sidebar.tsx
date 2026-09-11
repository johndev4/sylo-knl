'use client';

import { Sidebar, SidebarRail } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { SidebarDocumentList } from '../document/components';
import { SidebarLibraryNav } from './sidebar-library-nav';

interface LibrarySidebarProps {
  userRole: string;
}

export function LibrarySidebar({ userRole }: LibrarySidebarProps) {
  const pathname = usePathname();

  // Split the pathname into segments and filter out empty strings
  const segments = pathname.split('/').filter(Boolean);
  // Determine if we are on a library route and extract the library ID
  const isLibraryRoute =
    segments[0] === 'hub' &&
    segments[1] === 'libraries' &&
    segments.length >= 3;
  const libraryId = isLibraryRoute ? segments[2] : null;
  // Determine if we are on a library documents route and extract the document ID
  const isLibraryDocumentsRoute = libraryId && segments[3] === 'documents';
  const isLibraryInfoRoute = libraryId && segments[3] === 'info';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    isLibraryRoute && (
      <Sidebar
        collapsible="offcanvas"
        className="top-[4.1rem] h-[calc(100vh-4.1rem)]"
        aria-label="Library Sidebar"
      >
        {/* Header */}
        {/* <SidebarHeader>
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
        </SidebarHeader> */}

        {/* Content */}
        {isLibraryDocumentsRoute ? (
          <SidebarDocumentList userRole={userRole} />
        ) : (
          isLibraryInfoRoute && <SidebarLibraryNav userRole={userRole} />
        )}

        <SidebarRail />
      </Sidebar>
    )
  );
}

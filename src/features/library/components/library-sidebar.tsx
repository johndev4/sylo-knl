'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar, SidebarRail, useSidebar } from '@/components/ui/sidebar';
import { SidebarDocumentList } from '../document/components';
import { SidebarLibraryNav } from './sidebar-library-nav';

interface LibrarySidebarProps {
  userRole: string;
}

export function LibrarySidebar({ userRole }: LibrarySidebarProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  // Automatically close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

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

  return isLibraryRoute ? (
    <Sidebar
      collapsible="offcanvas"
      className="top-[4.1rem] h-[calc(100vh-4.1rem)]"
      aria-label="Library Sidebar"
    >
      {/* Content */}
      {isLibraryDocumentsRoute ? (
        <SidebarDocumentList userRole={userRole} />
      ) : isLibraryInfoRoute ? (
        <SidebarLibraryNav userRole={userRole} />
      ) : null}

      <SidebarRail />
    </Sidebar>
  ) : null;
}

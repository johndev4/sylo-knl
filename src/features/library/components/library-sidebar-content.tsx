'use client';

import { usePathname } from 'next/navigation';
import { SidebarDocumentList } from '../document/components';
import { SidebarLibraryNav } from './sidebar-library-nav';

interface LibrarySidebarContentProps {
  userRole: string;
  libraryName: string;
}

/**
 * @deprecated
 */
export function LibrarySidebarContent({
  userRole,
  libraryName,
}: LibrarySidebarContentProps) {
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!isLibraryRoute) {
    return null;
  }

  if (isLibraryDocumentsRoute) {
    return <SidebarDocumentList userRole={userRole} />;
  } else {
    return <SidebarLibraryNav userRole={userRole} libraryName={libraryName} />;
  }
}

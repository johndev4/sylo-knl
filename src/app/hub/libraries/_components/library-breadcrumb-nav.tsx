/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { UrlObject } from 'url';

// Helper to capitalize first letter
const capFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

// Helper to determine if a string is a UUID
const isUUID = (str: string) => {
  const regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(str);
};

async function fetchLibraryName(id: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/libraries/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.library?.name ?? null;
  } catch {
    return null;
  }
}

async function fetchDocumentTitle(id: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/documents/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.document?.title ?? null;
  } catch {
    return null;
  }
}

export function LibraryBreadcrumbNav() {
  const pathname = usePathname();
  // State to hold dynamic names for library and document IDs
  const [dynamicNames, setDynamicNames] = React.useState<
    Record<string, string>
  >({});
  // State to track which IDs are currently loading
  const [loadingIds, setLoadingIds] = React.useState<Set<string>>(new Set());
  // Live title overrides broadcast by DocumentManager while the user types
  const [liveTitles, setLiveTitles] = React.useState<Record<string, string>>(
    {}
  );

  // Split the pathname into segments and filter out empty strings
  const segments = pathname.split('/').filter(Boolean);
  // Determine if we are on a library route and extract the library ID
  const isLibraryRoute =
    segments[0] === 'hub' &&
    segments[1] === 'libraries' &&
    segments.length >= 4;
  const libraryId = isLibraryRoute ? segments[2] : null;
  // Determine if we are on a library documents route and extract the document ID
  const isLibraryDocumentsRoute = libraryId && segments[3] === 'documents';
  const documentId =
    isLibraryDocumentsRoute && segments.length >= 5 ? segments[4] : null;

  // Listen for real-time title changes dispatched by DocumentManager
  React.useEffect(() => {
    const handler = (e: Event) => {
      const { documentId, title } = (
        e as CustomEvent<{ documentId: string; title: string }>
      ).detail;
      setLiveTitles((prev) => ({ ...prev, [documentId]: title }));
    };
    window.addEventListener('sylo:document:title-change', handler);
    return () =>
      window.removeEventListener('sylo:document:title-change', handler);
  }, []);

  // Fetch dynamic names for library and document IDs when the pathname changes
  React.useEffect(() => {
    const resolveNames = async () => {
      const newNames: Record<string, string> = {};
      const newLoading = new Set<string>();
      const toFetch: Array<{ segment: string; prevSegment: string | null }> =
        [];

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (isUUID(segment)) {
          const prevSegment = i > 0 ? segments[i - 1] : null;
          toFetch.push({ segment, prevSegment });
          newLoading.add(segment);
        }
      }

      if (toFetch.length === 0) return;

      setLoadingIds(new Set(newLoading));

      await Promise.all(
        toFetch.map(async ({ segment, prevSegment }) => {
          let name: string | null = null;
          if (prevSegment === 'libraries') {
            name = await fetchLibraryName(segment);
          } else if (prevSegment === 'documents') {
            name = await fetchDocumentTitle(segment);
          }
          if (name) newNames[segment] = name;
        })
      );

      setDynamicNames((prev) => ({ ...prev, ...newNames }));
      setLoadingIds(new Set());
    };

    resolveNames();
  }, [pathname]);

  const breadcrumbItems: Array<{
    key: string;
    label: React.ReactNode;
    href: string | UrlObject;
  }> = [];

  if (isLibraryRoute && libraryId) {
    const libraryLabel = loadingIds.has(libraryId) ? (
      <Skeleton className="h-4 w-24" />
    ) : (
      (dynamicNames[libraryId] ?? '')
    );

    breadcrumbItems.push({
      key: 'library',
      label: libraryLabel,
      href: `/hub/libraries/${libraryId}`,
    });

    breadcrumbItems.push({
      key: segments[3],
      label: capFirst(segments[3]),
      href: `/hub/libraries/${libraryId}/${segments[3]}`,
    });

    if (isLibraryDocumentsRoute && documentId) {
      let documentLabel;

      if (documentId === 'new') {
        const liveTitle = liveTitles['new'];
        documentLabel =
          liveTitle !== undefined && liveTitle !== ''
            ? liveTitle
            : 'Untitled Document';
      } else {
        const liveTitle = liveTitles[documentId];
        documentLabel =
          liveTitle !== undefined ? (
            liveTitle || 'Untitled Document'
          ) : loadingIds.has(documentId) ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            (dynamicNames[documentId] ?? '')
          );
      }

      breadcrumbItems.push({
        key: 'document',
        label: documentLabel,
        href: `/hub/libraries/${libraryId}/documents/${documentId}`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Breadcrumb>
      <BreadcrumbList className="sm:gap-2">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;

          return (
            <React.Fragment key={item.key}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

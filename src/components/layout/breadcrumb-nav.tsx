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

export function BreadcrumbNav() {
  const pathname = usePathname();
  const [dynamicNames, setDynamicNames] = React.useState<
    Record<string, string>
  >({});
  const [loadingIds, setLoadingIds] = React.useState<Set<string>>(new Set());

  const segments = pathname.split('/').filter(Boolean);
  const isLibraryRoute =
    segments[0] === 'hub' &&
    segments[1] === 'libraries' &&
    segments.length >= 4;
  const libraryId = isLibraryRoute ? segments[2] : null;
  const documentId =
    isLibraryRoute && segments.length >= 5 ? segments[4] : null;
  // const isEditPage = isLibraryRoute && segments[5] === 'edit';

  // We can toggle this to false if we want to hide breadcrumbs in certain contexts
  const showBreadcrumbs = true;

  React.useEffect(() => {
    if (!showBreadcrumbs) return;

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
  }, [pathname, showBreadcrumbs]);

  if (!showBreadcrumbs) return null;

  const breadcrumbItems: Array<{
    key: string;
    label: React.ReactNode;
    href: string;
  }> = [];

  if (isLibraryRoute && libraryId) {
    const libraryLabel = loadingIds.has(libraryId) ? (
      <Skeleton className="h-4 w-24" />
    ) : (
      (dynamicNames[libraryId] ?? 'New Document')
    );

    breadcrumbItems.push({
      key: 'library',
      label: libraryLabel,
      href: `/hub/libraries/${libraryId}/documents`,
    });

    breadcrumbItems.push({
      key: 'documents',
      label: 'Documents',
      href: `/hub/libraries/${libraryId}/documents`,
    });

    if (documentId) {
      const documentLabel = loadingIds.has(documentId) ? (
        <Skeleton className="h-4 w-24" />
      ) : (
        (dynamicNames[documentId] ?? 'New Document')
      );

      breadcrumbItems.push({
        key: 'document',
        label: documentLabel,
        href: `/hub/libraries/${libraryId}/documents/${documentId}`,
      });
    }

    // if (isEditPage && documentId) {
    //   breadcrumbItems.push({
    //     key: 'edit',
    //     label: 'Edit',
    //     href: `/hub/libraries/${libraryId}/documents/${documentId}/edit`,
    //   });
    // }
  } else {
    breadcrumbItems.push(
      ...segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        let label: React.ReactNode =
          segment.charAt(0).toUpperCase() + segment.slice(1);

        if (isUUID(segment)) {
          if (loadingIds.has(segment)) {
            label = <Skeleton className="h-4 w-24" />;
          } else if (dynamicNames[segment]) {
            label = dynamicNames[segment];
          } else {
            label = 'New Document';
          }
        }

        return {
          key: href,
          label,
          href,
        };
      })
    );
  }

  return (
    <div className="sticky top-0 z-10">
      <div className="w-full border-b border-zinc-200 bg-zinc-50 px-4 py-2 sm:px-6 lg:px-8 dark:border-zinc-800/50 dark:bg-zinc-900">
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
      </div>
    </div>
  );
}

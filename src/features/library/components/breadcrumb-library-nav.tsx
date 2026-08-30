/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { Fragment, ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { redirect, useParams, usePathname } from 'next/navigation';
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
import { getDocument } from '@/features/library/document/queries';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckIcon,
  ChevronsUpDownIcon,
  LibraryBigIcon,
  SlashIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUserLibraries } from '../queries';
import { UserLibraryList } from '../library-schema';
import { Spinner } from '@/components/ui/spinner';
import { User } from '@supabase/supabase-js';
import { useUser } from '@/hooks/use-user';

interface BreadcrumbLibraryNavProps {
  libraryName: string;
}

// Helper to capitalize first letter
const capFirst = (str: string | null | undefined) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

// Helper to determine if a string is a UUID
const isUUID = (str: string) => {
  const regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(str);
};

async function fetchDocumentTitle(
  id: string,
  user: User
): Promise<string | null> {
  try {
    const supabase = await createClient();
    const data = await getDocument(id, supabase, user);
    return data?.document?.title ?? null;
  } catch (err: any) {
    if (err.message === 'Document not found.') {
      console.warn(`[DEBUG] ${err.message}`);
    } else {
      console.error(`${err.message}`);
    }
    return null;
  }
}

export function BreadcrumbLibraryNav({
  libraryName,
}: BreadcrumbLibraryNavProps) {
  const { user } = useUser();

  if (!user) {
    redirect('/login');
  }

  const pathname = usePathname();

  // State of initial loading
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // State to hold dynamic names for library and document IDs
  const [dynamicNames, setDynamicNames] = useState<Record<string, string>>({});
  // State to track which IDs are currently loading
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  // Live title overrides broadcast by DocumentManager while the user types
  const [liveTitles, setLiveTitles] = useState<Record<string, string>>({});

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
  const documentId =
    isLibraryDocumentsRoute && segments.length >= 5 ? segments[4] : null;

  // Listen for real-time title changes dispatched by DocumentManager
  useEffect(() => {
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
  useEffect(() => {
    const resolveNames = async () => {
      setIsLoading(true);
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

      setIsLoading(false);
      setLoadingIds(new Set(newLoading));

      await Promise.all(
        toFetch.map(async ({ segment, prevSegment }) => {
          let name: string | null = null;
          if (prevSegment === 'documents') {
            name = await fetchDocumentTitle(segment, user);
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
    label: ReactNode;
    href: string | UrlObject;
  }> = [];

  if (isLibraryRoute && libraryId) {
    if (segments[3]?.trim()) {
      if (segments[3] === 'info') {
        breadcrumbItems.push({
          key: segments[3],
          label: 'Library Info',
          href: `/hub/libraries/${libraryId}/${segments[3]}`,
        });

        if (segments[4]?.trim()) {
          breadcrumbItems.push({
            key: segments[4],
            label: capFirst(segments[4]),
            href: `/hub/libraries/${libraryId}/${segments[4]}`,
          });
        }
      } else {
        breadcrumbItems.push({
          key: segments[3],
          label: capFirst(segments[3]),
          href: `/hub/libraries/${libraryId}/${segments[3]}`,
        });
      }
    }

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

  // Prevent to render the breadcrumbs on initial loading
  if (isLoading) {
    return <Skeleton className="h-4 w-24" />;
  }

  // Throw error if no library name and ID
  if (!libraryName || !libraryId) {
    throw new Error('Library name and ID was not found.');
  }

  return (
    <Breadcrumb>
      <BreadcrumbList className="sm:gap-2">
        {/* Library Selector */}
        <BreadcrumbItem>
          <LibraryBigIcon className="size-4" />
          <div className="flex items-center gap-1">
            <span>{libraryName}</span>
            <LibrarySelectorDropdown />
          </div>
        </BreadcrumbItem>

        <BreadcrumbSeparator>
          <SlashIcon />
        </BreadcrumbSeparator>

        {/* Dynamic Breadcrumb Items  */}
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          return (
            <Fragment key={item.key}>
              {index > 0 && (
                <BreadcrumbSeparator>
                  <SlashIcon />
                </BreadcrumbSeparator>
              )}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    render={<Link href={item.href}>{item.label}</Link>}
                  />
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function LibrarySelectorDropdown() {
  const { user } = useUser();

  if (!user) {
    redirect('/login');
  }

  const params = useParams();
  const libraryId = params?.id || '';

  const [userLibraryList, setUserLibraryList] = useState<UserLibraryList>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch all user libraries on mount
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const supabase = createClient();
      const libraries = await getUserLibraries(supabase, user);
      setUserLibraryList(libraries ?? []);
    })().then(() => setIsLoading(false));
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!isLoading && userLibraryList.length === 0) {
    console.error('[DEBUG] Not enough libraries to show dropdown menu.');
    return null;
  }

  return (
    <>
      <DropdownMenu>
        {isLoading ? (
          <Spinner className="size-3.5" />
        ) : (
          <DropdownMenuTrigger
            render={
              <Button variant={'ghost'} size={'icon-xs'}>
                <ChevronsUpDownIcon
                  data-icon="inline-end"
                  className="size-3.5"
                />
              </Button>
            }
          />
        )}
        <DropdownMenuContent align="start" className={'min-w-50'}>
          <DropdownMenuGroup>
            {userLibraryList.map((lib) => (
              <DropdownMenuItem
                key={lib.id}
                className="flex items-center justify-between"
              >
                {lib.name}
                {lib.id === libraryId && <CheckIcon className="size-3.5" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

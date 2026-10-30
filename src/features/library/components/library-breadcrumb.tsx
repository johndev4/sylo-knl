import { Suspense } from 'react';
import { getCachedLibraryName } from '../queries.server';
import { BreadcrumbLibraryNav } from './breadcrumb-library-nav';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

interface LibraryBreadcrumbProps {
  params: Promise<{ id: string }>;
}

export function LibraryBreadcrumb({ params }: LibraryBreadcrumbProps) {
  return (
    <Suspense fallback={null}>
      <LibraryBreadcrumbWrapper params={params} />
    </Suspense>
  );
}

async function LibraryBreadcrumbWrapper({ params }: LibraryBreadcrumbProps) {
  const { id: libraryId } = await params;
  const libraryName = await getCachedLibraryName(libraryId);
  if (!libraryName) throw new Error('Library not found');

  return (
    <header className="bg-background flex h-12 shrink-0 items-center gap-1 border-b border-neutral-200/50 px-3 sm:gap-2 sm:px-4 dark:border-neutral-800/50">
      <SidebarTrigger className="-ml-1 size-11 md:size-8" />
      <Separator orientation="vertical" className="mr-1 h-4 sm:mr-2" />
      <BreadcrumbLibraryNav libraryName={libraryName} />
    </header>
  );
}

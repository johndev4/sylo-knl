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
    <header className="bg-background flex h-12 shrink-0 items-center gap-2 border-b border-neutral-200/50 px-4 dark:border-neutral-800/50">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <BreadcrumbLibraryNav libraryName={libraryName} />
    </header>
  );
}

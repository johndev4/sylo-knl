import { ReactNode } from 'react';
import { guardLibraryAccess } from '@/lib/actions/guard-library-access';
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import { LibrarySidebar } from '@/app/hub/libraries/_components';

export default async function LibraryInfoLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const denied = await guardLibraryAccess(id);
  if (denied) return denied;

  return (
    <div className="flex min-h-0 flex-1 overflow-x-hidden">
      <LibrarySidebar />
      <div className="bg-background relative flex h-[calc(100vh-4.1rem)] min-w-0 flex-1 flex-col overflow-y-auto">
        <BreadcrumbNav />
        {children}
      </div>
    </div>
  );
}

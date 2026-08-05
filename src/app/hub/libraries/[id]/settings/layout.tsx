import { ReactNode } from 'react';
import { LIBRARY_ROLES } from '@/lib/actions/require-library-role';
import { guardLibraryAccess } from '@/lib/actions/guard-library-access';
import {
  LibraryBreadcrumbNav,
  LibrarySidebar,
} from '@/app/hub/libraries/_components';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export default async function LibrarySettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const denied = await guardLibraryAccess(id, LIBRARY_ROLES.ADMIN);
  if (denied) return denied;

  return (
    <SidebarProvider className="h-[calc(100vh-4.1rem)] min-h-0 flex-1">
      <LibrarySidebar />
      <SidebarInset className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="bg-background flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200/50 px-4 dark:border-zinc-800/50">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <LibraryBreadcrumbNav />
        </header>
        <div className="bg-background relative flex min-w-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

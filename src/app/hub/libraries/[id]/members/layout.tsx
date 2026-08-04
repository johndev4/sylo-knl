import { ReactNode } from 'react';
import { guardLibraryAccess } from '@/lib/actions/guard-library-access';
import { LibrarySidebar } from '@/app/hub/libraries/_components';
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export default async function LibraryMembersLayout({
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
    <SidebarProvider className="min-h-0 flex-1 h-[calc(100vh-4.1rem)]">
      <LibrarySidebar />
      <SidebarInset className="flex flex-col min-w-0 flex-1 overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200/50 bg-background px-4 dark:border-zinc-800/50">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <BreadcrumbNav />
        </header>
        <div className="bg-background relative flex flex-1 flex-col min-w-0 overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

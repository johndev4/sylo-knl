'use client';

import { DocumentsSidebar } from '@/app/hub/libraries/[id]/documents/_components';
import { SidebarRefreshProvider } from '@/app/hub/libraries/[id]/documents/_components/sidebar-refresh-context';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { LibraryBreadcrumbNav } from '../../_components';

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarRefreshProvider>
      <SidebarProvider className="h-[calc(100vh-4.1rem)] min-h-0 flex-1">
        <DocumentsSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="bg-background flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200/50 px-4 dark:border-zinc-800/50">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <LibraryBreadcrumbNav />
          </header>
          <div className="bg-background relative flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SidebarRefreshProvider>
  );
}

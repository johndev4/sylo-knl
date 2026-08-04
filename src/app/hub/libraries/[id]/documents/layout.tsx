'use client';

import { DocumentsSidebar } from '@/app/hub/libraries/[id]/documents/_components';
import { SidebarRefreshProvider } from '@/app/hub/libraries/[id]/documents/_components/sidebar-refresh-context';
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarRefreshProvider>
      <SidebarProvider className="min-h-0 flex-1 h-[calc(100vh-4.1rem)]">
        <DocumentsSidebar />
        <SidebarInset className="flex flex-col min-w-0 flex-1 overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200/50 bg-background px-4 dark:border-zinc-800/50">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <BreadcrumbNav />
          </header>
          <div className="bg-background relative flex flex-1 flex-col min-w-0 overflow-x-hidden overflow-y-auto">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SidebarRefreshProvider>
  );
}

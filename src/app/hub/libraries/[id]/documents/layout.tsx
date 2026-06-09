'use client';

import { DocumentsSidebar } from '@/app/hub/_components/documents/documents-sidebar';
import { SidebarRefreshProvider } from '@/app/hub/_components/documents/sidebar-refresh-context';
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarRefreshProvider>
      <div className="flex min-h-0 flex-1 overflow-x-hidden">
        <DocumentsSidebar />
        <div className="bg-background relative flex h-[calc(100vh-4.1rem)] min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <BreadcrumbNav />
          {children}
        </div>
      </div>
    </SidebarRefreshProvider>
  );
}

'use client';

import { DocumentsSidebar } from '@/components/documents/DocumentsSidebar';
import { SidebarRefreshProvider } from '@/components/documents/SidebarRefreshContext';

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarRefreshProvider>
      <div className="flex min-h-0 flex-1 overflow-x-hidden">
        <DocumentsSidebar />
        <div className="bg-background relative flex h-[calc(100vh-4.5rem)] min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </div>
    </SidebarRefreshProvider>
  );
}

import { SidebarRefreshProvider } from '@/components/providers/sidebar-refresh-provider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { requireLibraryRole } from '@/lib/auth/library-role';
import { Suspense } from 'react';
import {
  LibraryBreadcrumb,
  LibrarySidebar,
} from '@/features/library/components';

interface LibraryLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default function LibraryLayout({
  children,
  params,
}: LibraryLayoutProps) {
  return (
    <Suspense fallback={null}>
      <LibraryLayoutAsync params={params}>{children}</LibraryLayoutAsync>
    </Suspense>
  );
}

async function LibraryLayoutAsync({ children, params }: LibraryLayoutProps) {
  const { id } = await params;
  const membership = await requireLibraryRole(id);
  if (!membership) return <>{children}</>;

  return (
    <SidebarRefreshProvider>
      <SidebarProvider className="h-[calc(100vh-4.1rem)] min-h-0 flex-1">
        <LibrarySidebar userRole={membership.role} />

        <SidebarInset className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <LibraryBreadcrumb params={params} />
          <div
            className={
              'bg-background relative flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto'
            }
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SidebarRefreshProvider>
  );
}

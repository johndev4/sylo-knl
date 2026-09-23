import { SidebarRefreshProvider } from '@/components/providers/sidebar-refresh-provider';
import { requireLibraryRole } from '@/lib/auth/library-role';
import { Suspense } from 'react';
import {
  LibraryBreadcrumb,
  LibrarySidebar,
} from '@/features/library/components';
import { SidebarLayout } from '@/components/layout/sidebar-layout';

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
      <LibraryLayoutWrapper params={params}>{children}</LibraryLayoutWrapper>
    </Suspense>
  );
}

async function LibraryLayoutWrapper({ children, params }: LibraryLayoutProps) {
  const { id } = await params;
  const membership = await requireLibraryRole(id);
  if (!membership) return <>{children}</>;

  return (
    <SidebarRefreshProvider>
      <SidebarLayout sidebar={<LibrarySidebar userRole={membership.role} />}>
        <LibraryBreadcrumb params={params} />
        <div
          className={
            'bg-background relative flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto'
          }
        >
          {children}
        </div>
      </SidebarLayout>
    </SidebarRefreshProvider>
  );
}

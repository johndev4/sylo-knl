import { SidebarRefreshProvider } from '@/components/providers/sidebar-refresh-provider';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  LibraryBreadcrumbNav,
  LibrarySidebar,
} from '@/features/library/components';
import { Suspense } from 'react';
import { requireLibraryRole } from '@/lib/auth/library-role';
import { Spinner } from '@/components/ui/spinner';
import { SidebarDocumentList } from '@/features/library/document/components';
import { getCachedLibraryName } from '@/features/library/queries.server';

export default function LibraryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center p-8 py-8 text-center text-sm">
          <Spinner className="text-muted-foreground h-8 w-8" />
          Loading…
        </div>
      }
    >
      <LibraryLayoutShell params={params}>{children}</LibraryLayoutShell>
    </Suspense>
  );
}

async function LibraryLayoutShell({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await requireLibraryRole(id);
  if (!membership) return <>{children}</>;

  const libraryName = await getCachedLibraryName(id);

  return (
    <SidebarRefreshProvider>
      <SidebarProvider className="h-[calc(100vh-4.1rem)] min-h-0 flex-1">
        <LibrarySidebar
          libraryName={libraryName}
          sidebarContent={<SidebarDocumentList userRole={membership.role} />}
        />
        <SidebarInset className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="bg-background flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200/50 px-4 dark:border-zinc-800/50">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <LibraryBreadcrumbNav libraryName={libraryName} />
          </header>
          <div className="bg-background relative flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SidebarRefreshProvider>
  );
}

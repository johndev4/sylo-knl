import {
  LibraryBreadcrumbNav,
  LibraryInfoSidebar,
} from '@/components/features/libraries';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Suspense } from 'react';
import { requireLibraryRole } from '@/lib/auth/library-role';
import { Spinner } from '@/components/ui/spinner';

export default function LibraryInfoLayout({
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
      <LibraryInfoLayoutShell params={params}>
        {children}
      </LibraryInfoLayoutShell>
    </Suspense>
  );
}

async function LibraryInfoLayoutShell({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: libraryId } = await params;
  const membership = await requireLibraryRole(libraryId);
  if (!membership) return <>{children}</>;

  return (
    <SidebarProvider className="h-[calc(100vh-4.1rem)] min-h-0 flex-1">
      <LibraryInfoSidebar userRole={membership.role} />
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

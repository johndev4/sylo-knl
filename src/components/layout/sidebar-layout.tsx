import { SidebarInset, SidebarProvider } from '../ui/sidebar';

/**
 * Layout component that provides the sidebar context and renders the sidebar alongside
 * the main content area. This replaces the previous `SidebarProviderWrapper` which
 * performed the same responsibilities but had a misleading name.
 */
export function SidebarLayout({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}) {
  return (
    <SidebarProvider className="h-[calc(100vh-4.1rem)] min-h-0 flex-1">
      {sidebar}
      <SidebarInset className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

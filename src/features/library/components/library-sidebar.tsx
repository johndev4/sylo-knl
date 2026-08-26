import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Library } from 'lucide-react';

interface LibrarySidebarProps {
  libraryName: string;
  sidebarContent: React.ReactNode;
}

export async function LibrarySidebar({
  libraryName,
  sidebarContent,
}: LibrarySidebarProps) {
  return (
    <Sidebar
      collapsible="icon"
      className="top-[4.1rem] h-[calc(100vh-4.1rem)]"
      aria-label="Documents Sidebar"
    >
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex min-w-0 items-center justify-between gap-2 p-0 group-data-[collapsible=icon]:justify-center">
              <div className="flex min-w-0 items-center gap-2">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg">
                  <Library className="size-4" />
                </div>
                <div className="grid flex-1 overflow-hidden text-left text-xs leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="text-muted-foreground/70 text-[10px] font-bold tracking-wider uppercase">
                    Library
                  </span>
                  <span className="truncate text-sm font-semibold">
                    {libraryName ? (
                      libraryName
                    ) : (
                      <Skeleton className="h-4 w-24" />
                    )}
                  </span>
                </div>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content */}
      {sidebarContent}
    </Sidebar>
  );
}

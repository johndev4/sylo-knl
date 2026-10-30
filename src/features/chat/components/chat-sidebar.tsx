'use client';

import { useState } from 'react';
import {
  CheckCheck,
  Library as LibraryIcon,
  Search,
  X,
  BotMessageSquareIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useChatSidebar } from '@/features/chat/providers/chat-sidebar-provider';

export function ChatSidebar() {
  const {
    libraries,
    selectedIds,
    allSelected,
    noneSelected,
    toggleLibrary,
    toggleAll,
    clearSelection,
  } = useChatSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const filteredLibraries = libraries.filter((library) =>
    library.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Sidebar
      collapsible="offcanvas"
      className="top-[4.1rem] h-[calc(100vh-4.1rem)]"
      aria-label="Chat Sidebar"
    >
      <SidebarHeader>
        {/* <div className="flex flex-col items-center justify-between gap-2 group-data-[state=expanded]:flex-row"> */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="bg-sidebar-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
            <BotMessageSquareIcon className="text-sidebar-primary-foreground size-6" />
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <h1 className="truncate text-sm font-bold">Chat</h1>
            <p className="text-muted-foreground truncate text-[10px] font-medium uppercase">
              Sylo Assistant
            </p>
          </div>
        </div>
        {/* <SidebarTrigger /> */}
        {/* </div> */}
      </SidebarHeader>

      <SidebarContent className="group-data-[state=collapsed]:hidden">
        <SidebarGroup>
          <SidebarGroupLabel>
            <LibraryIcon />
            <span>Libraries ({libraries.length})</span>
          </SidebarGroupLabel>
          <SidebarGroupAction
            title={
              allSelected ? 'Deselect all libraries' : 'Select all libraries'
            }
            aria-label={
              allSelected ? 'Deselect all libraries' : 'Select all libraries'
            }
            onClick={toggleAll}
          >
            <CheckCheck />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <div className="relative mb-2 group-data-[collapsible=icon]:hidden">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                aria-label="Search libraries"
                placeholder="Search libraries..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-8 pl-9 text-xs"
              />
            </div>
            <SidebarMenu>
              {filteredLibraries.map((library) => {
                const isSelected = selectedIds.includes(library.id);
                return (
                  <SidebarMenuItem key={library.id}>
                    <SidebarMenuButton
                      isActive={isSelected}
                      onClick={() => toggleLibrary(library.id)}
                      tooltip={library.name}
                    >
                      <Checkbox
                        checked={isSelected}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="pointer-events-none"
                      />
                      <span>{library.name}</span>
                      <Badge
                        variant="outline"
                        className="bg-sidebar-accent text-sidebar-accent-foreground ml-auto h-4 border-none px-1 text-[9px] font-bold group-data-[collapsible=icon]:hidden"
                      >
                        {library.role}
                      </Badge>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {filteredLibraries.length === 0 && (
                <li className="text-muted-foreground px-2 py-3 text-center text-xs group-data-[collapsible=icon]:hidden">
                  No libraries found.
                </li>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="group-data-[state=collapsed]:hidden">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleAll}
              tooltip={allSelected ? 'Deselect all' : 'Select all'}
            >
              <CheckCheck />
              <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {!noneSelected && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={clearSelection}
                tooltip="Clear selection"
              >
                <X />
                <span>Clear selection</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
        <p className="text-muted-foreground px-2 text-[10px] group-data-[collapsible=icon]:hidden">
          Querying {selectedIds.length} libraries
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

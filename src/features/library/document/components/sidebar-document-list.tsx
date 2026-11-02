'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Plus,
  Search,
  FileText,
  Calendar,
  MessageSquare,
  Info,
  ChevronRightIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { TagFilterPopover } from '@/features/library/document/components/tag-filter-popover';
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useGetDocumentsSWRInfinite } from '@/features/library/document/swr';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VirtualRow = { type: 'doc'; id: string } | { type: 'load-more' };

interface SidebarDocumentListProps {
  userRole: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SidebarDocumentList({ userRole }: SidebarDocumentListProps) {
  const params = useParams();
  const libraryId = params?.id as string;
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNavClick = useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  const [isClient, setIsClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    documents,
    totalDocs,
    size,
    setSize,
    isLoading,
    isLoadingMore,
    hasMore,
  } = useGetDocumentsSWRInfinite(libraryId, debouncedSearchQuery, selectedTags);

  useEffect(() => {
    setSize(1);
  }, [setSize]);

  // ---------------------------------------------------------------------------
  // Virtual scroll setup
  // ---------------------------------------------------------------------------

  // Ref to the ScrollArea's inner viewport element (data-slot="scroll-area-viewport").
  // We use a callback ref so the virtualizer re-initialises if the node changes.
  const scrollViewportRef = useRef<Element | null>(null);
  const [scrollViewportNode, setScrollViewportNode] = useState<Element | null>(
    null
  );

  const scrollAreaCallbackRef = useCallback((rootNode: HTMLElement | null) => {
    const viewport = rootNode?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    );
    scrollViewportRef.current = viewport ?? null;
    setScrollViewportNode(viewport ?? null);
  }, []);

  // Build the flat list of virtual rows: one per document + optional "load-more" sentinel.
  const rows = useMemo<VirtualRow[]>(() => {
    const docRows: VirtualRow[] = documents.map((doc) => ({
      type: 'doc',
      id: doc.id,
    }));
    if (hasMore) {
      return [...docRows, { type: 'load-more' }];
    }
    return docRows;
  }, [documents, hasMore]);

  // Each document item is ~60px tall (h-auto py-2 with two text lines at ~20px each).
  // The "load-more" button row is ~48px (p-2 + h-8).
  const rowSizes = useMemo(
    () => rows.map((r) => (r.type === 'load-more' ? 48 : 60)),
    [rows]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollViewportRef.current as HTMLElement | null,
    estimateSize: (index) => rowSizes[index] ?? 60,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalVirtualHeight = virtualizer.getTotalSize();

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const isAtLimit = totalDocs >= 500;
  const newDocumentPath = `/hub/libraries/${libraryId}/documents/new`;

  const isInitialLoad =
    isLoading &&
    documents.length === 0 &&
    !searchQuery &&
    selectedTags.length === 0;
  const isSearching = searchQuery !== debouncedSearchQuery || isLoading;

  return (
    isClient && (
      <>
        <SidebarContent aria-label="Sidebar Document List Content">
          {/* Fixed Filters Area (Hidden when collapsed into icon mode) */}
          <div className="border-sidebar-border flex shrink-0 flex-col gap-2.5 border-b p-3 group-data-[collapsible=icon]:hidden">
            {isInitialLoad ? (
              <div className="space-y-3 p-2">
                <Skeleton className="h-5 w-full rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                  <Input
                    placeholder="Search docs…"
                    name="documentSearch"
                    aria-label="Search documents"
                    autoComplete="off"
                    className="focus-visible:ring-primary/30 border-sidebar-border bg-sidebar-accent/50 h-11 pr-8 pl-8 text-base focus-visible:ring-1 md:h-8 md:text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {isSearching && (
                    <Spinner className="text-muted-foreground absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2" />
                  )}
                </div>

                <div className="flex items-end justify-between">
                  <TagFilterPopover
                    libraryId={libraryId}
                    selectedTags={selectedTags}
                    onApplyTags={(tags) => {
                      setSelectedTags(tags);
                    }}
                  />

                  {/* Create New Document Button */}
                  {!!userRole && userRole !== 'VIEWER' && (
                    <>
                      {isAtLimit ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground/50 h-7 w-7 cursor-not-allowed"
                          title="Maximum limit of 500 documents reached."
                          aria-label="New Document"
                          disabled
                          aria-disabled
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-7 w-7"
                          title="New Document"
                          aria-label="New Document"
                          render={
                            <Link
                              href={newDocumentPath}
                              onClick={(e) => {
                                handleNavClick();
                                if (pathname === newDocumentPath) {
                                  e.preventDefault();
                                  window.dispatchEvent(
                                    new CustomEvent(
                                      'sylo:new-document:reset-request'
                                    )
                                  );
                                }
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Link>
                          }
                        />
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* New Document Button in collapsed mode */}
          {userRole !== 'VIEWER' && (
            <div className="hidden p-2 group-data-[collapsible=icon]:block">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link
                        href={newDocumentPath}
                        onClick={(e) => {
                          handleNavClick();
                          if (pathname === newDocumentPath) {
                            e.preventDefault();
                            window.dispatchEvent(
                              new CustomEvent('sylo:new-document:reset-request')
                            );
                          }
                        }}
                      >
                        <Plus />
                        <span>New Document</span>
                      </Link>
                    }
                    tooltip="New Document"
                    disabled={isAtLimit}
                  />
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          )}

          <Collapsible
            key={'DOCUMENTS'}
            title={'Document List'}
            defaultOpen
            className="group/collapsible group-data-[collapsible=icon]:hidden"
          >
            {/* Documents Group */}
            {isInitialLoad ? (
              <SidebarMenu>
                {Array.from({ length: 5 }).map((_, index) => (
                  <SidebarMenuItem key={index}>
                    <SidebarMenuSkeleton />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : (
              <SidebarGroup>
                <SidebarGroupLabel
                  render={
                    <CollapsibleTrigger className="text-xs font-semibold transition-colors">
                      <span>DOCUMENTS ({totalDocs})</span>
                      <ChevronRightIcon className="ml-auto transition-transform group-data-open/collapsible:rotate-90 group-data-[state=open]/collapsible:rotate-90" />
                    </CollapsibleTrigger>
                  }
                  className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm"
                />

                <CollapsibleContent className="flex min-h-0 flex-1 flex-col">
                  <SidebarGroupContent className="flex min-h-0 flex-1 flex-col">
                    {/* ref callback: walks the Shadow/DOM to find the scrollable viewport
                        inside ScrollArea so the virtualizer can attach to it */}
                    <ScrollArea
                      className="h-[calc(100vh-20rem)]"
                      ref={scrollAreaCallbackRef}
                    >
                      <AnimatePresence initial={false}>
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          {documents.length === 0 ? (
                            <SidebarMenu className="gap-1">
                              <div className="text-muted-foreground px-4 py-3 text-center text-xs group-data-[collapsible=icon]:hidden">
                                No documents found.
                              </div>
                            </SidebarMenu>
                          ) : (
                            /* Virtual list: outer div sets total scrollable height;
                               inner div is translated to the current virtual offset */
                            <SidebarMenu
                              className="relative gap-0"
                              style={{ height: `${totalVirtualHeight}px` }}
                              // Suppress the React hydration warning that can arise from
                              // style being computed post-mount.
                              suppressHydrationWarning
                            >
                              {scrollViewportNode !== null && (
                                <div
                                  className="absolute top-0 left-0 w-full"
                                  style={{
                                    transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
                                  }}
                                >
                                  {virtualItems.map((virtualRow) => {
                                    const row = rows[virtualRow.index];
                                    if (!row) return null;

                                    if (row.type === 'load-more') {
                                      return (
                                        <div
                                          key="load-more"
                                          data-index={virtualRow.index}
                                          ref={virtualizer.measureElement}
                                          className="p-2 group-data-[collapsible=icon]:hidden"
                                        >
                                          <Button
                                            variant="outline"
                                            onClick={() => setSize(size + 1)}
                                            disabled={isLoadingMore}
                                            className="h-8 w-full text-[10px] font-bold tracking-widest uppercase"
                                          >
                                            {isLoadingMore ? (
                                              <Spinner className="h-4 w-4" />
                                            ) : (
                                              `Load More (${totalDocs - documents.length} Left)`
                                            )}
                                          </Button>
                                        </div>
                                      );
                                    }

                                    const doc = documents[virtualRow.index];
                                    if (!doc) return null;
                                    const isActive =
                                      pathname ===
                                      `/hub/libraries/${libraryId}/documents/${doc.id}`;

                                    return (
                                      <SidebarMenuItem
                                        key={doc.id}
                                        data-index={virtualRow.index}
                                        ref={virtualizer.measureElement}
                                      >
                                        <SidebarMenuButton
                                          render={
                                            <Link
                                              href={`/hub/libraries/${libraryId}/documents/${doc.id}`}
                                              className="flex flex-col items-start gap-0.5"
                                              onClick={handleNavClick}
                                            >
                                              <div className="flex w-full items-center gap-2">
                                                <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                                                <span
                                                  className="truncate text-xs font-medium group-data-[collapsible=icon]:hidden"
                                                  title={doc.title}
                                                >
                                                  {doc.title}
                                                </span>
                                              </div>
                                              <div className="text-muted-foreground/60 flex items-center pl-6 text-[10px] group-data-[collapsible=icon]:hidden">
                                                <Calendar className="mr-1 h-3 w-3" />
                                                {new Date(doc.created_at)
                                                  .toLocaleDateString(
                                                    undefined,
                                                    {
                                                      month: 'short',
                                                      day: 'numeric',
                                                      year: 'numeric',
                                                    }
                                                  )
                                                  .toUpperCase()}
                                              </div>
                                            </Link>
                                          }
                                          isActive={isActive}
                                          tooltip={doc.title}
                                          size="lg"
                                          className="h-auto py-2"
                                        />
                                      </SidebarMenuItem>
                                    );
                                  })}
                                </div>
                              )}
                            </SidebarMenu>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </ScrollArea>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            )}
          </Collapsible>
        </SidebarContent>

        {/* Footer Navigation */}
        <SidebarFooter className="border-t">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <Link
                    href={`/chat?libraryIds=${libraryId}`}
                    onClick={handleNavClick}
                  >
                    <MessageSquare />
                    <span>Chat</span>
                  </Link>
                }
                tooltip="Chat"
              />
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <Link
                    href={`/hub/libraries/${libraryId}/info`}
                    onClick={handleNavClick}
                  >
                    <Info />
                    <span>Library Info</span>
                    <ChevronRightIcon className="ml-auto" />
                  </Link>
                }
                tooltip="Library Info"
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </>
    )
  );
}

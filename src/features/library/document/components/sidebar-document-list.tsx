'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { redirect, useParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
} from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { useSidebarRefresh } from '@/components/providers/sidebar-refresh-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { getDocuments } from '@/features/library/document/queries';
import { getLibraryAllTags } from '@/features/library/queries';
import { DocumentListItem } from '@/features/library/document/document-schema';
import { createClient } from '@/lib/supabase/client';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useSession } from '@/components/providers/auth-provider';

interface SidebarDocumentListProps {
  userRole: string;
}

export function SidebarDocumentList({ userRole }: SidebarDocumentListProps) {
  const { refreshKey } = useSidebarRefresh();
  const { user } = useSession();

  if (!user) {
    redirect('/login');
  }

  const params = useParams();
  const libraryId = params?.id as string;
  const pathname = usePathname();

  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Ref to track the latest request to avoid out-of-order responses
  const activeRequestIdRef = useRef(0);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);

  // Debounce search query input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load distinct tags for library filter dropdown (kept for reference, can be removed if not used elsewhere)
  useEffect(() => {
    if (!libraryId) return;
    let isCancelled = false;

    (async () => {
      try {
        const supabase = await createClient();
        await getLibraryAllTags(libraryId, supabase);
        // Note: Not storing result as we're using backend search now
        if (isCancelled) return;
      } catch (error) {
        console.error('Failed to fetch library tags:', error);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [libraryId, refreshKey]);

  // Fetch documents directly from the backend with current filters
  const fetchDocuments = useCallback(
    async (
      pageToLoad = 1,
      searchTerm = debouncedSearchQuery,
      tagFilter = selectedTags
    ) => {
      if (!libraryId) return;

      const requestId = ++activeRequestIdRef.current;
      setIsLoading(true);

      try {
        const supabase = await createClient();
        const trimmedSearch = searchTerm.trim();
        const filterTags =
          tagFilter && tagFilter.length > 0 ? tagFilter : undefined;

        const data = await getDocuments(
          {
            libraryId,
            limit: 100,
            page: pageToLoad,
            search: trimmedSearch || undefined,
            tags: filterTags,
          },
          supabase,
          user
        );

        // Discard stale response if a newer request was dispatched
        if (requestId !== activeRequestIdRef.current) {
          return;
        }

        if (pageToLoad === 1) {
          setDocuments(data.data || []);
        } else {
          setDocuments((prev) => [...prev, ...(data.data || [])]);
        }
        setTotalDocs(data.metadata?.total || 0);
      } catch (error) {
        if (requestId === activeRequestIdRef.current) {
          console.error('Failed to fetch documents:', error);
        }
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setIsLoading(false);
          setIsInitialLoading(false);
        }
      }
    },
    [libraryId, user, debouncedSearchQuery, selectedTags]
  );

  // Trigger backend fetch when search filter, tag filter, or refreshKey changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
    fetchDocuments(1, debouncedSearchQuery, selectedTags);
  }, [debouncedSearchQuery, selectedTags, refreshKey, fetchDocuments]);

  const isAtLimit = totalDocs >= 500;
  const newDocumentPath = `/hub/libraries/${libraryId}/documents/new`;

  const isSearching =
    searchQuery !== debouncedSearchQuery || (isLoading && page === 1);

  return (
    isClient && (
      <>
        <SidebarContent aria-label="Sidebar Document List Content">
          {/* Fixed Filters Area (Hidden when collapsed into icon mode) */}
          <div className="border-sidebar-border flex shrink-0 flex-col gap-2.5 border-b p-3 group-data-[collapsible=icon]:hidden">
            {isInitialLoading ? (
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
                    className="focus-visible:ring-primary/30 border-sidebar-border bg-sidebar-accent/50 h-8 pr-8 pl-8 text-xs focus-visible:ring-1"
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
                    refreshKey={refreshKey}
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
            {isLoading && page === 1 ? (
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

                <CollapsibleContent>
                  <SidebarGroupContent className="flex min-h-0 flex-1 flex-col">
                    <ScrollArea className="min-h-0 flex-1">
                      <AnimatePresence initial={false}>
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <SidebarMenu className="gap-1">
                            {documents.length === 0 ? (
                              <div className="text-muted-foreground px-4 py-3 text-center text-xs group-data-[collapsible=icon]:hidden">
                                No documents found.
                              </div>
                            ) : (
                              documents.map((doc) => {
                                const isActive =
                                  pathname ===
                                  `/hub/libraries/${libraryId}/documents/${doc.id}`;
                                return (
                                  <SidebarMenuItem key={doc.id}>
                                    <SidebarMenuButton
                                      render={
                                        <Link
                                          href={`/hub/libraries/${libraryId}/documents/${doc.id}`}
                                          className="flex flex-col items-start gap-0.5"
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
                                              .toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                              })
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
                              })
                            )}

                            {totalDocs > documents.length && (
                              <div className="p-2 group-data-[collapsible=icon]:hidden">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    const next = page + 1;
                                    setPage(next);
                                    fetchDocuments(
                                      next,
                                      debouncedSearchQuery,
                                      selectedTags
                                    );
                                  }}
                                  disabled={isLoading}
                                  className="h-8 w-full text-[10px] font-bold tracking-widest uppercase"
                                >
                                  {isLoading ? (
                                    <Spinner className="h-4 w-4" />
                                  ) : (
                                    `Load More (${totalDocs - documents.length} Left)`
                                  )}
                                </Button>
                              </div>
                            )}
                          </SidebarMenu>
                        </motion.div>
                      </AnimatePresence>
                      <ScrollBar orientation="vertical" />
                    </ScrollArea>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            )}
          </Collapsible>
        </SidebarContent>

        {/* Footer Navigation */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <Link href={`/chat?libraryIds=${libraryId}`}>
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
                  <Link href={`/hub/libraries/${libraryId}/info`}>
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

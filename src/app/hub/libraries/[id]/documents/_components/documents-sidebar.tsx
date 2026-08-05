'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Calendar,
  MessageSquare,
  Info,
  Library,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { useSidebarRefresh } from './sidebar-refresh-context';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface Document {
  id: string;
  title: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

function TruncatedTitle({ title }: { title: string }) {
  const maxLength = 32; // Character limit for sidebar titles
  const isTruncated = title.length > maxLength;
  const displayTitle = isTruncated ? title.slice(0, maxLength) + '...' : title;

  const content = (
    <div className="text-foreground w-full overflow-hidden whitespace-nowrap">
      {displayTitle}
    </div>
  );

  if (!isTruncated) {
    return content;
  }

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[300px] break-words">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

export function DocumentsSidebar() {
  const params = useParams();
  const libraryId = params?.id as string;
  const pathname = usePathname();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  const [isDocsOpen, setIsDocsOpen] = useState(true);
  const [library, setLibrary] = useState<{ name: string } | null>(null);
  const { refreshKey } = useSidebarRefresh();

  const fetchLibrary = useCallback(async () => {
    if (!libraryId) return;
    try {
      const res = await fetch(`/api/libraries/${libraryId}`);
      if (res.ok) {
        const data = await res.json();
        setLibrary(data.library);
      }
    } catch (error) {
      console.error('Failed to fetch library:', error);
    }
  }, [libraryId]);

  const fetchDocuments = useCallback(
    async (pageToLoad = 1) => {
      if (!libraryId) return;
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/documents?libraryId=${libraryId}&limit=100&page=${pageToLoad}`
        );
        if (res.ok) {
          const data = await res.json();
          if (pageToLoad === 1) {
            setDocuments(data.data || []);
          } else {
            setDocuments((prev) => [...prev, ...(data.data || [])]);
          }
          setTotalDocs(data.metadata?.total || 0);
        }
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [libraryId]
  );

  useEffect(() => {
    // Reset to page 1 on refresh
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
    fetchDocuments(1);
    fetchLibrary();
  }, [fetchDocuments, fetchLibrary, refreshKey]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    documents.forEach((doc) => {
      doc.tags?.forEach((tag) => tags.add(tag.toUpperCase()));
    });
    return ['ALL', ...Array.from(tags).sort()];
  }, [documents]);

  // Filter documents based on search and selected tag
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = doc.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesTag =
        selectedTag === 'ALL' ||
        (doc.tags && doc.tags.some((t) => t.toUpperCase() === selectedTag));
      return matchesSearch && matchesTag;
    });
  }, [documents, searchQuery, selectedTag]);

  const isAtLimit = totalDocs >= 500;
  const newDocumentPath = `/hub/libraries/${libraryId}/documents/new`;

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
                    {library ? library.name : <Skeleton className="h-4 w-24" />}
                  </span>
                </div>
              </div>

              {/* Create New Document Button */}
              <div className="group-data-[collapsible=icon]:hidden">
                {isAtLimit ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground/50 h-7 w-7 cursor-not-allowed"
                    title="Maximum limit of 500 documents reached."
                    disabled
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="New Document"
                  >
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
                      <Plus className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Fixed Filters Area (Hidden when collapsed into icon mode) */}
        <div className="border-sidebar-border flex shrink-0 flex-col gap-2.5 border-b p-3 group-data-[collapsible=icon]:hidden">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder="Search docs..."
              className="focus-visible:ring-primary/30 border-sidebar-border bg-sidebar-accent/50 h-8 pl-8 text-xs focus-visible:ring-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="border-sidebar-border bg-sidebar-accent/50 h-8 text-xs font-bold tracking-wider">
              <SelectValue placeholder="FILTER BY TAG" />
            </SelectTrigger>
            <SelectContent>
              {allTags.map((tag) => (
                <SelectItem
                  key={tag}
                  value={tag}
                  className="text-[10px] font-bold tracking-wider uppercase"
                >
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* New Document Button in collapsed mode */}
        <div className="hidden p-2 group-data-[collapsible=icon]:block">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="New Document"
                disabled={isAtLimit}
              >
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
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>

        {/* Documents Group */}
        <SidebarGroup className="flex min-h-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="justify-between">
            <button
              className="hover:text-foreground flex items-center gap-1 text-xs font-semibold transition-colors"
              onClick={() => setIsDocsOpen(!isDocsOpen)}
            >
              {isDocsOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span>DOCUMENTS ({totalDocs})</span>
            </button>
          </SidebarGroupLabel>

          <SidebarGroupContent className="flex min-h-0 flex-1 flex-col">
            <ScrollArea className="min-h-0 flex-1">
              <AnimatePresence initial={false}>
                {isDocsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <SidebarMenu className="max-w-60 gap-1">
                      {isLoading && page === 1 ? (
                        <div className="flex justify-center p-4">
                          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                        </div>
                      ) : filteredDocuments.length === 0 ? (
                        <div className="text-muted-foreground px-4 py-3 text-center text-xs group-data-[collapsible=icon]:hidden">
                          No documents found.
                        </div>
                      ) : (
                        filteredDocuments.map((doc) => {
                          const isActive =
                            pathname ===
                            `/hub/libraries/${libraryId}/documents/${doc.id}`;
                          return (
                            <SidebarMenuItem key={doc.id}>
                              <SidebarMenuButton
                                asChild
                                isActive={isActive}
                                tooltip={doc.title}
                                size="lg"
                                className="h-auto py-2"
                              >
                                <Link
                                  href={`/hub/libraries/${libraryId}/documents/${doc.id}`}
                                  className="flex flex-col items-start gap-0.5"
                                >
                                  <div className="flex w-full items-center gap-2">
                                    <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                                    <span className="truncate text-xs font-medium group-data-[collapsible=icon]:hidden">
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
                              </SidebarMenuButton>
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
                              fetchDocuments(next);
                            }}
                            disabled={isLoading}
                            className="h-8 w-full text-[10px] font-bold tracking-widest uppercase"
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              `Load More (${totalDocs - documents.length} Left)`
                            )}
                          </Button>
                        </div>
                      )}
                    </SidebarMenu>
                  </motion.div>
                )}
              </AnimatePresence>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer Navigation */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Chat">
              <Link href={`/hub/chat?libraryId=${libraryId}`}>
                <MessageSquare />
                <span>Chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Library Info">
              <Link href={`/hub/libraries/${libraryId}/overview`}>
                <Info />
                <span>Library Info</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

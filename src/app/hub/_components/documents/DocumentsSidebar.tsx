'use client';

import * as React from 'react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Settings,
  Grid,
  FileText,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSidebarRefresh } from './SidebarRefreshContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(true);
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

  if (!isOpen) {
    return (
      <div className="sticky top-0 flex h-[calc(100vh-4.5rem)] w-16 shrink-0 flex-col items-center border-r border-zinc-200/10 bg-zinc-50 py-4 transition-all duration-300 dark:border-zinc-800/20 dark:bg-[#09090b]">
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
          <PanelLeft className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  const isAtLimit = totalDocs >= 500;
  const newDocumentPath = `/hub/libraries/${libraryId}/documents/new`;

  return (
    <aside className="sticky top-0 flex h-[calc(100vh-4.5rem)] w-72 shrink-0 flex-col border-r border-zinc-200/10 bg-zinc-50 transition-all duration-300 dark:border-zinc-800/20 dark:bg-[#09090b]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200/10 p-4 dark:border-zinc-800/20">
        <div className="mr-2 flex flex-1 flex-col gap-0.5 overflow-hidden">
          <span className="text-muted-foreground/50 text-[10px] font-bold tracking-widest uppercase">
            Library
          </span>
          <div className="text-foreground flex items-center gap-1.5 truncate text-xs font-bold">
            <Grid className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{library?.name || 'Loading...'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isAtLimit ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground/50 h-6 w-6 cursor-not-allowed"
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
              className="h-6 w-6"
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
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsOpen(false)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Fixed Filters Area */}
        <div className="flex shrink-0 flex-col gap-3 border-b border-zinc-200/10 p-4 dark:border-zinc-800/20">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search docs..."
              className="focus-visible:ring-primary/30 h-8 border-transparent bg-zinc-100/50 pl-9 text-xs focus-visible:ring-1 dark:bg-zinc-900/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="h-8 border-transparent bg-zinc-100/50 text-xs font-bold tracking-wider dark:bg-zinc-900/50">
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

        {/* Documents Header - Fixed outside scroll */}
        <div className="shrink-0 px-4 pt-4">
          <button
            className="text-muted-foreground hover:text-foreground mb-1 flex w-full items-center px-2 py-1 text-xs font-medium transition-colors"
            onClick={() => setIsDocsOpen(!isDocsOpen)}
          >
            {isDocsOpen ? (
              <ChevronDown className="mr-1 h-3 w-3" />
            ) : (
              <ChevronRight className="mr-1 h-3 w-3" />
            )}
            <FileText className="mr-2 h-3 w-3" />
            DOCUMENTS ({totalDocs})
          </button>
        </div>

        {/* Scrollable Documents List */}
        <ScrollArea className="h-full min-h-0 flex-1">
          <div className="px-2 py-2">
            <AnimatePresence initial={false}>
              {isDocsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-1 flex flex-col gap-0.5 overflow-hidden"
                >
                  {isLoading && page === 1 ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                    </div>
                  ) : filteredDocuments.length === 0 ? (
                    <div className="text-muted-foreground px-8 py-4 text-center text-xs">
                      No documents found.
                    </div>
                  ) : (
                    filteredDocuments.map((doc) => {
                      const isActive =
                        pathname ===
                        `/hub/libraries/${libraryId}/documents/${doc.id}`;
                      return (
                        <Link
                          key={doc.id}
                          href={`/hub/libraries/${libraryId}/documents/${doc.id}`}
                          className={cn(
                            'group relative block w-full overflow-hidden rounded-md px-6 py-2.5 text-sm transition-all',
                            isActive
                              ? 'text-foreground bg-zinc-200/50 font-semibold shadow-sm dark:bg-zinc-800/80'
                              : 'text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900/50'
                          )}
                        >
                          {isActive && (
                            <div className="bg-primary absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full" />
                          )}
                          <TruncatedTitle title={doc.title} />
                          <div className="text-muted-foreground/60 mt-1 flex items-center text-[10px] font-medium tracking-tight">
                            <Calendar className="mr-1.5 h-3 w-3" />
                            {new Date(doc.created_at)
                              .toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                              .toUpperCase()}
                          </div>
                        </Link>
                      );
                    })
                  )}
                  {totalDocs > documents.length && (
                    <div className="mt-4 px-4 pb-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPage((p) => p + 1);
                          fetchDocuments(page + 1);
                        }}
                        disabled={isLoading}
                        className="text-muted-foreground/50 hover:text-foreground h-10 w-full rounded-lg border-zinc-200/10 bg-transparent text-[10px] font-bold tracking-widest uppercase transition-all hover:bg-zinc-100/5 dark:border-zinc-800/50"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          `Load More (${totalDocs - documents.length} Left)`
                        )}
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>

      {/* Footer Navigation */}
      <div className="mt-auto flex shrink-0 flex-col gap-1.5 border-t border-zinc-200 bg-inherit p-4 dark:border-zinc-800/50">
        <Button
          asChild
          variant="ghost"
          className="text-muted-foreground hover:text-foreground w-full justify-start"
        >
          <Link href={`/hub/libraries/${libraryId}/settings`}>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Link>
        </Button>
      </div>
    </aside>
  );
}

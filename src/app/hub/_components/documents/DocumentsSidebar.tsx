'use client';

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
  MessageSquare,
  Grid,
  FileText,
  Loader2,
  Calendar,
  Funnel,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSidebarRefresh } from './SidebarRefreshContext';

interface Document {
  id: string;
  title: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export function DocumentsSidebar() {
  const params = useParams();
  const libraryId = params?.id as string;
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');

  const [isTagsOpen, setIsTagsOpen] = useState(true);
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

  const fetchDocuments = useCallback(async () => {
    if (!libraryId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/documents?libraryId=${libraryId}&limit=100`
      );
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [libraryId]);

  useEffect(() => {
    fetchDocuments();
    fetchLibrary();
  }, [fetchDocuments, fetchLibrary, refreshKey]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    documents.forEach((doc) => {
      doc.tags?.forEach((tag) => tags.add(tag));
    });
    return ['All', ...Array.from(tags).sort()];
  }, [documents]);

  // Filter documents based on search and selected tag
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = doc.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesTag =
        selectedTag === 'All' || (doc.tags && doc.tags.includes(selectedTag));
      return matchesSearch && matchesTag;
    });
  }, [documents, searchQuery, selectedTag]);

  if (!isOpen) {
    return (
      <div className="sticky top-0 flex h-[calc(100vh-4rem)] w-16 shrink-0 flex-col items-center border-r border-zinc-200/10 bg-zinc-50 py-4 transition-all duration-300 dark:border-zinc-800/20 dark:bg-[#09090b]">
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
          <PanelLeft className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="sticky top-0 flex h-[calc(100vh-4.5rem)] w-72 shrink-0 flex-col border-r border-zinc-200/10 bg-zinc-50 transition-all duration-300 dark:border-zinc-800/20 dark:bg-[#09090b]">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex flex-col gap-0.5 overflow-hidden">
          <span className="text-muted-foreground/50 text-[10px] font-bold tracking-widest uppercase">
            Library
          </span>
          <div className="text-foreground flex items-center gap-1.5 truncate text-xs font-bold">
            <Grid className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{library?.name || 'Loading...'}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsOpen(false)}
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* New Doc Button */}
      <div className="mb-4 px-4">
        <Button
          asChild
          className="w-full justify-center border bg-white text-black shadow-sm hover:bg-zinc-200 dark:bg-zinc-100 dark:text-zinc-900"
        >
          <Link href={`/hub/libraries/${libraryId}/documents/new`}>
            <Plus className="mr-2 h-4 w-4" /> New Doc
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6 px-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search docs..."
            className="focus-visible:ring-primary/30 border-transparent bg-zinc-100/50 pl-9 focus-visible:ring-1 dark:bg-zinc-900/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Tags Section */}
        <div className="mb-6 px-2">
          <button
            className="text-muted-foreground hover:text-foreground mb-2 flex w-full items-center px-2 py-1 text-xs font-medium transition-colors"
            onClick={() => setIsTagsOpen(!isTagsOpen)}
          >
            {isTagsOpen ? (
              <ChevronDown className="mr-1 h-3 w-3" />
            ) : (
              <ChevronRight className="mr-1 h-3 w-3" />
            )}
            <Funnel className="mr-2 h-3 w-3" />
            TAGS
          </button>

          <AnimatePresence initial={false}>
            {isTagsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 grid grid-cols-2 gap-1.5 px-4">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      className={cn(
                        'rounded-lg border px-2 py-1.5 text-[9px] font-bold tracking-tighter uppercase transition-all',
                        selectedTag === tag
                          ? 'border-zinc-200 bg-zinc-100 text-black shadow-sm dark:border-white dark:bg-white dark:text-black'
                          : 'text-muted-foreground/60 hover:text-foreground border-transparent bg-transparent hover:border-zinc-200 dark:hover:border-zinc-800'
                      )}
                      onClick={() => setSelectedTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Documents List */}
        <div className="px-2 pb-4">
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
            DOCUMENTS ({filteredDocuments.length})
          </button>

          <AnimatePresence initial={false}>
            {isDocsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-1 flex flex-col gap-0.5 overflow-hidden"
              >
                {isLoading ? (
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
                        `/hub/libraries/${libraryId}/documents/${doc.id}` ||
                      pathname ===
                        `/hub/libraries/${libraryId}/documents/${doc.id}/edit`;
                    return (
                      <Link
                        key={doc.id}
                        href={`/hub/libraries/${libraryId}/documents/${doc.id}`}
                        className={cn(
                          'group relative rounded-md px-6 py-2.5 text-sm transition-all',
                          isActive
                            ? 'text-foreground bg-zinc-200/50 font-semibold shadow-sm dark:bg-zinc-800/80'
                            : 'text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900/50'
                        )}
                      >
                        {isActive && (
                          <div className="bg-primary absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full" />
                        )}
                        <div className="truncate">{doc.title}</div>
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
              </motion.div>
            )}
          </AnimatePresence>

          {documents.length > 5 && (
            <div className="mt-8 px-4 pb-4">
              <Button
                variant="outline"
                className="text-muted-foreground/30 hover:text-foreground h-10 w-full rounded-lg border-zinc-200/10 bg-transparent text-[10px] font-bold tracking-widest uppercase transition-all hover:bg-zinc-100/5 dark:border-zinc-800/50"
              >
                Load More ({documents.length - filteredDocuments.length} Left)
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Navigation - Pushed to bottom */}
      <div className="mt-auto flex shrink-0 flex-col gap-1.5 border-t border-zinc-200 bg-inherit p-4 dark:border-zinc-800/50">
        <Button
          asChild
          variant="ghost"
          className="text-muted-foreground hover:text-foreground w-full justify-start"
        >
          <Link href={`/hub/libraries/${libraryId}/chat`}>
            <MessageSquare className="mr-2 h-4 w-4" /> AI Chat
          </Link>
        </Button>
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
    </div>
  );
}

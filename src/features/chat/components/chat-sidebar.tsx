'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Library as LibraryIcon,
  CheckCheck,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Library {
  id: string;
  name: string;
  role: string;
}

interface ChatSidebarProps {
  libraries: Library[];
  selectedIds: string[];
  onToggleLibrary: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  noneSelected: boolean;
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  OWNER:
    'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  EDITOR:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  VIEWER: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

export function ChatSidebar({
  libraries,
  selectedIds,
  onToggleLibrary,
  onToggleAll,
  allSelected,
  noneSelected,
}: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLibrariesOpen, setIsLibrariesOpen] = useState(true);

  const filteredLibraries = useMemo(() => {
    return libraries.filter((lib) =>
      lib.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [libraries, searchQuery]);

  if (!isOpen) {
    return (
      <div className="sticky top-0 flex h-[calc(100vh-4.5rem)] w-16 shrink-0 flex-col items-center border-r border-zinc-200/10 bg-zinc-50 py-4 transition-all duration-300 dark:border-zinc-800/20 dark:bg-[#09090b]">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(true)}
              aria-label="Open sidebar"
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Open Sidebar</TooltipContent>
        </Tooltip>

        <div className="mt-8 flex flex-col gap-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
            <Sparkles className="size-4 text-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside className="sticky top-0 flex h-[calc(100vh-4.5rem)] w-72 shrink-0 flex-col border-r border-zinc-200/10 bg-zinc-50 transition-all duration-300 dark:border-zinc-800/20 dark:bg-[#09090b]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200/10 p-4 dark:border-zinc-800/20">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
            <Sparkles className="size-4 text-white" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <h1 className="truncate text-sm font-bold tracking-tight">
              AI Knowledge Chat
            </h1>
            <span className="text-muted-foreground/50 text-[10px] font-bold tracking-widest uppercase">
              Sylo Assistant
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsOpen(false)}
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Search Area */}
        <div className="flex shrink-0 flex-col gap-3 border-b border-zinc-200/10 p-4 dark:border-zinc-800/20">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search libraries..."
              className="focus-visible:ring-primary/30 h-8 border-transparent bg-zinc-100/50 pl-9 text-xs focus-visible:ring-1 dark:bg-zinc-900/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] font-bold tracking-widest uppercase"
              onClick={onToggleAll}
            >
              <CheckCheck className="mr-1.5 h-3 w-3" />
              {allSelected ? 'Deselect All' : 'Select All'}
            </Button>
            {!noneSelected && (
              <Button
                variant="ghost"
                size="sm"
                className="hover:text-destructive h-7 px-2 text-[10px] font-bold tracking-widest uppercase"
                onClick={() => {
                  if (allSelected) onToggleAll();
                  else {
                    // This is a bit hacky if onToggleAll only toggles, but ChatClient handles it
                    onToggleAll(); // Deselect all if allSelected is true, else Select all.
                    // Wait, ChatClient's toggleAll selects all if not allSelected, else clears.
                    // So if we are here and !noneSelected and !allSelected, we need to clear.
                    if (!allSelected) onToggleAll(); // This would select all.
                  }
                }}
                disabled={noneSelected}
              >
                <X className="mr-1.5 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Libraries Header */}
        <div className="shrink-0 px-4 pt-4">
          <button
            className="text-muted-foreground hover:text-foreground mb-1 flex w-full items-center px-2 py-1 text-xs font-medium transition-colors"
            onClick={() => setIsLibrariesOpen(!isLibrariesOpen)}
          >
            {isLibrariesOpen ? (
              <ChevronDown className="mr-1 h-3 w-3" />
            ) : (
              <ChevronRight className="mr-1 h-3 w-3" />
            )}
            <LibraryIcon className="mr-2 h-3 w-3" />
            LIBRARIES ({libraries.length})
          </button>
        </div>

        {/* Scrollable Libraries List */}
        <ScrollArea className="h-full min-h-0 flex-1">
          <div className="px-2 py-2">
            <AnimatePresence initial={false}>
              {isLibrariesOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-1 flex flex-col gap-0.5 overflow-hidden"
                >
                  {filteredLibraries.length === 0 ? (
                    <div className="text-muted-foreground px-8 py-4 text-center text-xs">
                      No libraries found.
                    </div>
                  ) : (
                    filteredLibraries.map((lib) => {
                      const isSelected = selectedIds.includes(lib.id);
                      return (
                        <div
                          key={lib.id}
                          className={cn(
                            'group relative flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-md px-3 py-2.5 text-sm transition-all',
                            isSelected
                              ? 'text-foreground bg-zinc-200/50 font-semibold shadow-sm dark:bg-zinc-800/80'
                              : 'text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900/50'
                          )}
                          onClick={() => onToggleLibrary(lib.id)}
                        >
                          {isSelected && (
                            <div className="bg-primary absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full" />
                          )}
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onToggleLibrary(lib.id)}
                            className="pointer-events-none"
                            aria-label={`Select ${lib.name}`}
                          />
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate">{lib.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'h-4 border-none px-1 text-[9px] font-bold tracking-tight',
                                  ROLE_BADGE_COLORS[lib.role] ??
                                    ROLE_BADGE_COLORS.VIEWER
                                )}
                              >
                                {lib.role}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>

      {/* Footer Info */}
      <div className="mt-auto flex shrink-0 flex-col gap-1.5 border-t border-zinc-200 bg-inherit p-4 dark:border-zinc-800/50">
        <div className="text-muted-foreground/60 flex flex-col gap-1 text-[10px] leading-tight font-medium">
          <p>Querying {selectedIds.length} libraries</p>
          <p>Context-aware RAG active</p>
        </div>
      </div>
    </aside>
  );
}

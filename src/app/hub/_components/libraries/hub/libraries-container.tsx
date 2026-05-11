'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LibrariesBentoGrid } from './library-grid';
import { LibrariesTable } from './libraries-table';
import { Grid3x3, Table2, ChevronDown } from 'lucide-react';
import { CreateLibraryDialog } from './create-library-dialog';
import { cn } from '@/lib/utils';

type Membership = {
  role: string;
  library: { id: string; name: string; created_at: string };
  memberCount: number;
  docCount: number;
};

interface LibrariesContainerProps {
  memberships: Membership[];
}

export function LibrariesContainer({ memberships }: LibrariesContainerProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    'name' | 'created' | 'members' | 'documents'
  >('name');

  // Get unique roles
  const availableRoles = useMemo(() => {
    const roles = new Set(memberships.map((m) => m.role));
    return Array.from(roles).sort();
  }, [memberships]);

  // Filter and sort memberships
  const filtered = useMemo(() => {
    let result = memberships;

    // Search by library name
    if (search) {
      result = result.filter((m) =>
        m.library.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by role
    if (roleFilter) {
      result = result.filter((m) => m.role === roleFilter);
    }

    // Sort
    switch (sortBy) {
      case 'created':
        result = [...result].sort(
          (a, b) =>
            new Date(b.library.created_at).getTime() -
            new Date(a.library.created_at).getTime()
        );
        break;
      case 'members':
        result = [...result].sort((a, b) => b.memberCount - a.memberCount);
        break;
      case 'documents':
        result = [...result].sort((a, b) => b.docCount - a.docCount);
        break;
      case 'name':
      default:
        result = [...result].sort((a, b) =>
          a.library.name.localeCompare(b.library.name)
        );
    }

    return result;
  }, [memberships, search, roleFilter, sortBy]);

  const prefersReducedMotion = useReducedMotion();

  const panelVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.35,
        ease: 'easeOut' as const,
      },
    },
  };

  const viewVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.35,
        ease: 'easeOut' as const,
      },
    },
    exit: {
      opacity: 0,
      y: -8,
      transition: { duration: prefersReducedMotion ? 0 : 0.25 },
    },
  };

  return (
    <motion.div
      className="w-full space-y-4 px-0 sm:px-0"
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      layout
    >
      {/* Controls */}
      <motion.div
        className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center"
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        layout
      >
        {/* Left: Search & Filters */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Input
            placeholder="Search libraries..."
            aria-label="Search libraries"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full cursor-text sm:w-48"
          />

          {/* Role Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                {roleFilter ? `Role: ${roleFilter}` : 'All Roles'}
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setRoleFilter(null)}>
                All Roles
              </DropdownMenuItem>
              {availableRoles.map((role) => (
                <DropdownMenuItem
                  key={role}
                  onSelect={() => setRoleFilter(role)}
                >
                  {role}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort By */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                Sort:{' '}
                {sortBy === 'created'
                  ? 'Date'
                  : sortBy === 'members'
                    ? 'Members'
                    : sortBy === 'documents'
                      ? 'Documents'
                      : 'Name'}
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[
                { value: 'name', label: 'Name' },
                { value: 'created', label: 'Date Created' },
                { value: 'members', label: 'Members' },
                { value: 'documents', label: 'Documents' },
              ].map(({ value, label }) => (
                <DropdownMenuItem
                  key={value}
                  onSelect={() =>
                    setSortBy(
                      value as 'name' | 'created' | 'members' | 'documents'
                    )
                  }
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: View Toggle + Create */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-100/50 p-1 dark:border-zinc-800 dark:bg-zinc-900/50">
            {(['grid', 'table'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'focus-visible:ring-ring relative flex h-8 w-8 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                  viewMode === mode
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                )}
                title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} view`}
                aria-label={`${mode.charAt(0).toUpperCase() + mode.slice(1)} view`}
              >
                {viewMode === mode && (
                  <motion.div
                    layoutId="view-mode-pill"
                    className="absolute inset-0 rounded-md bg-white shadow-sm dark:bg-zinc-800"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}
                {mode === 'grid' ? (
                  <Grid3x3 className="relative z-10 h-4 w-4" />
                ) : (
                  <Table2 className="relative z-10 h-4 w-4" />
                )}
              </button>
            ))}
          </div>
          <CreateLibraryDialog size="sm" variant="outline" />
        </div>
      </motion.div>

      {/* Results count */}
      <motion.div
        className="text-sm text-zinc-600 dark:text-zinc-400"
        variants={panelVariants}
        layout
      >
        Showing {filtered.length} of {memberships.length} librar
        {memberships.length !== 1 ? 'ies' : 'y'}
      </motion.div>

      {/* View */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            variants={viewVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <p className="text-lg font-semibold">No libraries found</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {search || roleFilter
                ? 'Try adjusting your filters or search'
                : 'Create your first library to get started'}
            </p>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            key="grid"
            variants={viewVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
          >
            <LibrariesBentoGrid memberships={filtered} />
          </motion.div>
        ) : (
          <motion.div
            key="table"
            variants={viewVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
          >
            <LibrariesTable memberships={filtered} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

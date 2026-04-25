'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LibrariesBentoGrid } from './LibraryGrid';
import { LibrariesTable } from './LibrariesTable';
import { Grid3x3, Table2, ChevronDown } from 'lucide-react';
import { CreateLibraryDialog } from './CreateLibraryDialog';
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
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'members' | 'documents'>('name');
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Get unique roles
  const availableRoles = useMemo(() => {
    const roles = new Set(memberships.map(m => m.role));
    return Array.from(roles).sort();
  }, [memberships]);

  // Filter and sort memberships
  const filtered = useMemo(() => {
    let result = memberships;

    // Search by library name
    if (search) {
      result = result.filter(m =>
        m.library.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by role
    if (roleFilter) {
      result = result.filter(m => m.role === roleFilter);
    }

    // Sort
    switch (sortBy) {
      case 'created':
        result = [...result].sort((a, b) =>
          new Date(b.library.created_at).getTime() - new Date(a.library.created_at).getTime()
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
    visible: { opacity: 1, y: 0, transition: { duration: prefersReducedMotion ? 0 : 0.35, ease: 'easeOut' as const } },
  };

  const viewVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: prefersReducedMotion ? 0 : 0.35, ease: 'easeOut' as const } },
    exit: { opacity: 0, y: -8, transition: { duration: prefersReducedMotion ? 0 : 0.25 } },
  };

  return (
    <motion.div className="w-full space-y-4 px-0 sm:px-0" variants={panelVariants} initial="hidden" animate="visible" layout>
      {/* Controls */}
      <motion.div
        className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between"
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        layout
      >
        {/* Left: Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search libraries..."
            aria-label="Search libraries"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-48 cursor-text"
          />

          {/* Role Filter */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              aria-haspopup="true"
              aria-expanded={showRoleMenu}
              aria-controls="role-menu"
              className="w-full sm:w-auto cursor-pointer"
            >
              {roleFilter ? `Role: ${roleFilter}` : 'All Roles'}
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
            {showRoleMenu && (
              <div id="role-menu" className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded shadow-lg">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  onClick={() => {
                    setRoleFilter(null);
                    setShowRoleMenu(false);
                  }}
                >
                  All Roles
                </button>
                {availableRoles.map(role => (
                  <button
                    key={role}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    onClick={() => {
                      setRoleFilter(role);
                      setShowRoleMenu(false);
                    }}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort By */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSortMenu(!showSortMenu)}
              aria-haspopup="true"
              aria-expanded={showSortMenu}
              aria-controls="sort-menu"
              className="w-full sm:w-auto cursor-pointer"
            >
              Sort: {sortBy === 'created' ? 'Date' : sortBy === 'members' ? 'Members' : sortBy === 'documents' ? 'Documents' : 'Name'}
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
            {showSortMenu && (
              <div id="sort-menu" className="absolute top-full right-0 mt-1 z-50 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded shadow-lg min-w-[140px]">
                {[
                  { value: 'name', label: 'Name' },
                  { value: 'created', label: 'Date Created' },
                  { value: 'members', label: 'Members' },
                  { value: 'documents', label: 'Documents' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    onClick={() => {
                      setSortBy(value as any);
                      setShowSortMenu(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: View Toggle + Create */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-lg p-1 border border-zinc-200 dark:border-zinc-800">
            {(['grid', 'table'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "relative h-8 w-8 flex items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  viewMode === mode
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                )}
                title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} view`}
                aria-label={`${mode.charAt(0).toUpperCase() + mode.slice(1)} view`}
              >
                {viewMode === mode && (
                  <motion.div
                    layoutId="view-mode-pill"
                    className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm rounded-md"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                  />
                )}
                {mode === 'grid' ? (
                  <Grid3x3 className="h-4 w-4 relative z-10" />
                ) : (
                  <Table2 className="h-4 w-4 relative z-10" />
                )}
              </button>
            ))}
          </div>
          <CreateLibraryDialog size="sm" variant="outline" />
        </div>
      </motion.div>

      {/* Results count */}
      <motion.div className="text-sm text-zinc-600 dark:text-zinc-400" variants={panelVariants} layout>
        Showing {filtered.length} of {memberships.length} library{memberships.length !== 1 ? 's' : ''}
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
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {search || roleFilter ? 'Try adjusting your filters or search' : 'Create your first library to get started'}
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

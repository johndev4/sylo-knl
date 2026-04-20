'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkspaceGrid } from './WorkspaceGrid';
import { WorkspacesTable } from './WorkspacesTable';
import { Grid3x3, Table2, ChevronDown } from 'lucide-react';

type Membership = {
  role: string;
  workspace: { id: string; name: string; created_at: string };
  memberCount: number;
  docCount: number;
};

interface WorkspacesContainerProps {
  memberships: Membership[];
}

export function WorkspacesContainer({ memberships }: WorkspacesContainerProps) {
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

    // Search by workspace name
    if (search) {
      result = result.filter(m =>
        m.workspace.name.toLowerCase().includes(search.toLowerCase())
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
          new Date(b.workspace.created_at).getTime() - new Date(a.workspace.created_at).getTime()
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
          a.workspace.name.localeCompare(b.workspace.name)
        );
    }

    return result;
  }, [memberships, search, roleFilter, sortBy]);

  return (
    <div className="w-full space-y-4 px-0 sm:px-0">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Left: Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search workspaces..."
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
              className="w-full sm:w-auto cursor-pointer"
            >
              {roleFilter ? `Role: ${roleFilter}` : 'All Roles'}
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
            {showRoleMenu && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded shadow-lg">
                <button
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
              className="w-full sm:w-auto cursor-pointer"
            >
              Sort: {sortBy === 'created' ? 'Date' : sortBy === 'members' ? 'Members' : sortBy === 'documents' ? 'Documents' : 'Name'}
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
            {showSortMenu && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded shadow-lg min-w-[140px]">
                {[
                  { value: 'name', label: 'Name' },
                  { value: 'created', label: 'Date Created' },
                  { value: 'members', label: 'Members' },
                  { value: 'documents', label: 'Documents' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
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

        {/* Right: View Toggle */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1">
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            className="h-8 w-8 p-0"
            onClick={() => setViewMode('grid')}
            title="Grid view"
            aria-label="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            className="h-8 w-8 p-0"
            onClick={() => setViewMode('table')}
            title="Table view"
            aria-label="Table view"
          >
            <Table2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        Showing {filtered.length} of {memberships.length} workspace{memberships.length !== 1 ? 's' : ''}
      </div>

      {/* View */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-semibold">No workspaces found</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {search || roleFilter ? 'Try adjusting your filters or search' : 'Create your first workspace to get started'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <WorkspaceGrid memberships={filtered} />
      ) : (
        <WorkspacesTable memberships={filtered} />
      )}
    </div>
  );
}

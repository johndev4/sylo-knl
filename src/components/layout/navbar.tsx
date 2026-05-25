'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { AccountDropdown } from '@/components/layout/account-dropdown';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';

function GlobalNav() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const showNav = !isLoading && !!user && pathname !== '/login';

  if (!showNav) return null;

  return (
    <div className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-6 md:flex">
      {/* Library Hub Nav Item */}
      <Link
        href="/hub"
        className="text-foreground transition-smooth text-sm font-medium hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        Library Hub
      </Link>
      {/* Chat Nav Item */}
      <Link
        href="/hub/chat"
        className="text-foreground transition-smooth text-sm font-medium hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        Chat
      </Link>
    </div>
  );
}

export function Navbar() {
  return (
    <nav
      className={cn(
        'sticky top-0 z-40 w-full',
        'border-b border-zinc-200/50 dark:border-zinc-800/50',
        'bg-white/80 backdrop-blur-md dark:bg-zinc-950/80',
        'shadow-sm dark:shadow-none'
      )}
    >
      <div className="relative flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo / Brand */}
        <Link
          href="/"
          className={cn(
            'flex items-center gap-2 text-lg font-bold',
            'text-foreground',
            'transition-smooth hover:text-zinc-700 dark:hover:text-zinc-300'
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-bold">Sy</span>
          </div>
          <span className="hidden sm:inline">
            Sylo{' '}
            <span className="text-muted-foreground font-normal">
              / Knowledge Library
            </span>
          </span>
        </Link>

        {/* Global Navigation */}
        <Suspense fallback={null}>
          <GlobalNav />
        </Suspense>

        {/* Theme Toggle & Account Dropdown */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AccountDropdown />
        </div>
      </div>
    </nav>
  );
}

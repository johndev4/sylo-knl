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
    <div className="ml-4 hidden items-center gap-1 md:flex">
      {/* Library Hub Nav Item */}
      <Link
        href="/hub"
        className={cn(
          'focus-visible:ring-ring rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
          pathname === '/hub' ||
            (pathname.startsWith('/hub/') && !pathname.startsWith('/chat'))
            ? 'text-foreground bg-zinc-100 dark:bg-zinc-800/50'
            : 'text-muted-foreground hover:text-foreground hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30'
        )}
      >
        Library Hub
      </Link>
      {/* Chat Nav Item */}
      <Link
        href="/chat"
        className={cn(
          'focus-visible:ring-ring rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
          pathname.startsWith('/chat')
            ? 'text-foreground bg-zinc-100 dark:bg-zinc-800/50'
            : 'text-muted-foreground hover:text-foreground hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30'
        )}
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
        'bg-background/80 backdrop-blur-md',
        'shadow-sm dark:shadow-none'
      )}
    >
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Logo / Brand */}
          <Link
            href="/"
            className={cn(
              'flex items-center gap-2 text-lg font-bold',
              'text-foreground',
              'focus-visible:ring-ring rounded-lg transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none'
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-zinc-50 shadow-sm dark:bg-zinc-100 dark:text-zinc-900">
              <span className="text-xs font-bold">Sy</span>
            </div>
            <span className="hidden tracking-tight sm:inline">Sylo</span>
          </Link>

          {/* Global Navigation */}
          <Suspense fallback={null}>
            <GlobalNav />
          </Suspense>
        </div>

        {/* Theme Toggle & Account Dropdown */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <AccountDropdown />
        </div>
      </div>
    </nav>
  );
}

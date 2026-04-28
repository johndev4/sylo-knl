'use client';

import Link from 'next/link';
import { AccountDropdown } from '@/components/AccountDropdown';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

export function Navbar() {
  return (
    <nav
      className={cn(
        'sticky top-0 z-40 w-full',
        'border-b border-zinc-200 dark:border-zinc-800/50',
        'bg-white/80 backdrop-blur-sm dark:bg-zinc-950/80',
        'shadow-soft-xs dark:shadow-soft-sm'
      )}
    >
      <div className="flex h-16 max-w-full items-center justify-between px-4 sm:px-6 lg:px-8">
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
        <div className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-6 md:flex">
          <Link
            href="/hub"
            className="text-foreground transition-smooth text-sm font-medium hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Library Hub
          </Link>
          {/* Chat is temporarily hidden as requested */}
          {/* <Link href="/chat" className="text-sm font-medium text-foreground hover:text-zinc-700 dark:hover:text-zinc-300 transition-smooth">
            Chat
          </Link> */}
        </div>

        {/* Theme Toggle & Account Dropdown */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AccountDropdown />
        </div>
      </div>
    </nav>
  );
}

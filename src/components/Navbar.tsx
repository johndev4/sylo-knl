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
        'bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm',
        'shadow-soft-xs dark:shadow-soft-sm'
      )}
    >
      <div className="max-w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link
          href="/"
          className={cn(
            'flex items-center gap-2 font-bold text-lg',
            'text-foreground',
            'hover:text-zinc-700 dark:hover:text-zinc-300 transition-smooth'
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
            <span className="text-xs font-bold">SL</span>
          </div>
          <span className="hidden sm:inline">Sylo</span>
        </Link>

        {/* Theme Toggle & Account Dropdown */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AccountDropdown />
        </div>
      </div>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { AccountDropdown } from '@/components/AccountDropdown';
import { cn } from '@/lib/utils';

export function Navbar() {
  return (
    <nav
      className={cn(
        'sticky top-0 z-40 w-full',
        'border-b border-border/40 dark:border-border/20',
        'bg-background/80 dark:bg-background/60 backdrop-blur-sm',
        'shadow-sm dark:shadow-lg'
      )}
    >
      <div className="max-w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link
          href="/"
          className={cn(
            'flex items-center gap-2 font-bold text-lg',
            'text-foreground dark:text-foreground/95',
            'hover:text-foreground/80 dark:hover:text-foreground/70 transition-colors'
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-accent/30 dark:bg-accent/20 flex items-center justify-center">
            <span className="text-sm font-bold">SL</span>
          </div>
          <span className="hidden sm:inline">Sylo</span>
        </Link>

        {/* Account Dropdown */}
        <AccountDropdown />
      </div>
    </nav>
  );
}

import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { AccountDropdown } from './account-dropdown';
import { Navbar } from './navbar';
import { EggIcon } from 'lucide-react';
import Link from 'next/link';

export function AppHeader() {
  return (
    <div
      className={cn(
        'sticky top-0 z-40 w-full',
        'border-b border-neutral-200/50 dark:border-neutral-800/50',
        'bg-background/80 backdrop-blur-md'
      )}
    >
      <div className="flex h-16 w-full items-center justify-between px-4">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Logo / Brand */}
          <Link
            className={cn(
              'flex items-center gap-2 text-lg font-bold',
              'text-foreground'
            )}
            href="/"
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center shadow-xs',
                'bg-background dark:bg-background',
                'rounded-md border border-neutral-200 dark:border-neutral-800'
              )}
            >
              <EggIcon className="size-4.5" />
            </div>
            <span className="hidden tracking-wider uppercase sm:inline">
              Sylo
            </span>
          </Link>

          {/* Global Navigation */}
          <Navbar />
        </div>

        {/* Theme Toggle & Account Dropdown */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <AccountDropdown />
        </div>
      </div>
    </div>
  );
}

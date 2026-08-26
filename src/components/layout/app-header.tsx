import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import { AccountDropdown } from './account-dropdown';
import { Navbar } from './navbar';
import { getUserNonRedirect } from '@/lib/auth/get-user';

export async function AppHeader() {
  const user = await getUserNonRedirect();

  return (
    <nav
      className={cn(
        'sticky top-0 z-40 w-full',
        'border-b border-zinc-200/50 dark:border-zinc-800/50',
        'bg-background/80 backdrop-blur-md',
        'shadow-sm dark:shadow-none'
      )}
    >
      <div className="flex h-16 w-full items-center justify-between px-4">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Logo / Brand */}
          <Link
            href="/hub"
            className={cn(
              'flex items-center gap-2 text-lg font-bold',
              'text-foreground',
              'focus-visible:ring-ring rounded-lg transition-opacity hover:opacity-80 focus-visible:ring-1 focus-visible:outline-none'
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-zinc-50 shadow-sm dark:bg-zinc-100 dark:text-zinc-900">
              <span className="text-xs font-bold">Sy</span>
            </div>
            <span className="hidden tracking-tight sm:inline">Sylo</span>
          </Link>

          {/* Global Navigation */}
          <Navbar user={user} />
        </div>

        {/* Theme Toggle & Account Dropdown */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <AccountDropdown user={user} />
        </div>
      </div>
    </nav>
  );
}

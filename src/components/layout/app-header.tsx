import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { AccountDropdown } from './account-dropdown';
import { Navbar } from './navbar';
import { getUserNonRedirect } from '@/lib/auth/get-user';
import { Suspense } from 'react';
import { EggIcon } from 'lucide-react';

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
          <div
            className={cn(
              'flex items-center gap-2 text-lg font-bold',
              'text-foreground',
              'cursor-default'
            )}
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
          </div>

          {/* Global Navigation */}
          <Suspense fallback={null}>
            <NavbarWrapper />
          </Suspense>
        </div>

        {/* Theme Toggle & Account Dropdown */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Suspense fallback={null}>
            <AccountDropdownWrapper />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function NavbarWrapper() {
  const user = await getUserNonRedirect();
  return user && <Navbar user={user} />;
}

async function AccountDropdownWrapper() {
  const user = await getUserNonRedirect();
  return user && <AccountDropdown user={user} />;
}

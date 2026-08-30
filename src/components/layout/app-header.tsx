import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { AccountDropdown } from './account-dropdown';
import { Navbar } from './navbar';
import { getUserNonRedirect } from '@/lib/auth/get-user';
import { Suspense } from 'react';

export function AppHeader() {
  return (
    <nav
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
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 text-neutral-50 shadow-sm dark:bg-neutral-100 dark:text-neutral-900">
              <span className="text-xs font-bold">Sy</span>
            </div>
            <span className="hidden tracking-tight sm:inline">Sylo</span>
          </div>

          {/* Global Navigation */}
          <Suspense fallback={null}>
            <NavbarAsync />
          </Suspense>
        </div>

        {/* Theme Toggle & Account Dropdown */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Suspense fallback={null}>
            <AccountDropdownAsync />
          </Suspense>
        </div>
      </div>
    </nav>
  );
}

async function NavbarAsync() {
  const user = await getUserNonRedirect();

  if (!user) {
    return null;
  }

  return user && <Navbar user={user} />;
}

async function AccountDropdownAsync() {
  const user = await getUserNonRedirect();

  if (!user) {
    return null;
  }

  return user && <AccountDropdown user={user} />;
}

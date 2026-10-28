import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { AccountDropdown } from './account-dropdown';
import { Navbar } from './navbar';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getProfileDropdownUserInfo } from '@/features/user/queries';
import { getUserNonRedirect } from '@/lib/auth/get-user';
import { Suspense } from 'react';
import { DropdownMenu, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Spinner } from '../ui/spinner';
import Image from 'next/image';

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
              <Image
                src="/sylo.svg"
                alt="Sylo Logo"
                width={150}
                height={50}
                priority
              />
            </div>
            <span className="font-logo hidden text-lg font-bold tracking-[0.16em] uppercase select-none sm:inline">
              Sylo
            </span>
          </Link>

          {/* Global Navigation */}
          <Navbar />
        </div>

        {/* Theme Toggle & Account Dropdown */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Suspense fallback={<AccountDropdownLoading />}>
            <AccountDropdownWrapper />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function AccountDropdownWrapper() {
  const user = await getUserNonRedirect();
  const userProfile = await createClient().then((supabase) =>
    user ? getProfileDropdownUserInfo(supabase, user) : null
  );

  return <AccountDropdown initialUserInfo={userProfile} />;
}

function AccountDropdownLoading() {
  return (
    <DropdownMenu open={false}>
      <DropdownMenuTrigger
        disabled
        aria-disabled
        render={
          <button
            className={cn(
              'flex items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5',
              'bg-neutral-100/80 hover:bg-neutral-200/80 dark:bg-neutral-800/50 dark:hover:bg-neutral-800',
              'border border-neutral-200/50 transition-colors outline-none dark:border-neutral-700/50'
            )}
            aria-label="Account menu"
          >
            {/* Avatar */}
            <div
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-xs font-semibold',
                'border border-neutral-200/50 bg-white text-neutral-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
              )}
            >
              <Spinner className="h-7 w-7" />
            </div>
          </button>
        }
      />
    </DropdownMenu>
  );
}

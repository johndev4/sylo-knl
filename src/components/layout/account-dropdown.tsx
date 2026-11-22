'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Settings } from 'lucide-react';
import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import {
  getProfileDropdownUserInfo,
  SWR_PROFILE_KEY,
} from '@/features/user/queries';
import { ThemeSubmenu } from '@/components/layout/theme-submenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ProfileDropdownUserInfo } from '@/features/user/user-schema';
import { UserAvatar } from '../shared/user-avatar';
import { logout } from '@/features/auth/actions';
import { useSession } from '../providers/auth-provider';
import { useState } from 'react';

/**
 * Standalone SWR fetcher for the account dropdown.

 * Creates its own Supabase client so it can be called without props.
 */
async function fetchProfileDropdownInfo(): Promise<ProfileDropdownUserInfo> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return getProfileDropdownUserInfo(supabase, user);
}

export function AccountDropdown({
  initialUserInfo,
}: {
  initialUserInfo: ProfileDropdownUserInfo | null;
}) {
  const { user } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  // SWR handles fetching, caching, and revalidation automatically.
  // `fallbackData` pre-populates from the SSR-provided prop — no loading flash.
  // When AccountSettingsForm calls `mutate(SWR_PROFILE_KEY)`, this updates too.
  const { data: userInfo } = useSWR(
    user && pathname !== '/login' ? SWR_PROFILE_KEY : null,
    fetchProfileDropdownInfo,
    { fallbackData: initialUserInfo ?? undefined }
  );

  const handleLogout = async () => {
    try {
      setIsOpen(false);
      await logout();
      window.location.replace('/login');
    } catch {}
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Prevent rendering for guests or when viewing the login screen
  if (!user || pathname === '/login') {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        render={
          <button
            className={cn(
              'flex items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5',
              'bg-neutral-100/80 hover:bg-neutral-200/80 dark:bg-neutral-800/50 dark:hover:bg-neutral-800',
              'border border-neutral-200/50 transition-colors outline-none dark:border-neutral-700/50'
            )}
            aria-label="Account menu"
          >
            <UserAvatar
              name={userInfo?.name}
              email={userInfo?.email}
              avatarUrl={userInfo?.avatarUrl}
              useAvatarUrl={userInfo?.useAvatarUrl}
            />

            {/* Display Name (hidden on mobile) */}
            {userInfo && (
              <span className="text-foreground hidden max-w-[150px] truncate text-sm font-medium sm:inline">
                {userInfo.name || userInfo.email}
              </span>
            )}
          </button>
        }
      />

      <DropdownMenuGroup>
        <DropdownMenuContent align="end" className="w-56">
          {/* User Profile Header */}
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <div className="px-3 py-2">
            {userInfo && (
              <>
                <p className="text-foreground truncate text-sm font-semibold">
                  {userInfo.name || 'User'}
                </p>
                <p className="text-foreground/60 truncate text-xs">
                  {userInfo.email}
                </p>
              </>
            )}
          </div>

          <DropdownMenuSeparator />

          {/* Account Settings */}
          <DropdownMenuItem onClick={() => router.push('/account/settings')}>
            <Settings className="h-4 w-4" />
            <span>Account Settings</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Theme Selection */}
          <ThemeSubmenu />

          <DropdownMenuSeparator />

          {/* Logout Button */}
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuGroup>
    </DropdownMenu>
  );
}

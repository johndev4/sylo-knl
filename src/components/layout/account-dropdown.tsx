'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getProfileDropdownUserInfo } from '@/features/user/queries';
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
import { Spinner } from '../ui/spinner';
import { ProfileDropdownUserInfo } from '@/features/user/user-schema';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { logout } from '@/features/auth/actions';
import { useSession } from '../providers/auth-provider';

export function AccountDropdown() {
  const { user } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<ProfileDropdownUserInfo | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile on mount
  useEffect(() => {
    if (!user || pathname === '/login') {
      return;
    }

    const fetchUserInfo = async () => {
      try {
        const supabase = createClient();
        const data = await getProfileDropdownUserInfo(supabase, user);
        setUserInfo(data);
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, [pathname, user]);

  const handleLogout = async () => {
    try {
      setIsOpen(false);
      await logout();
      window.location.replace('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const getInitials = (displayName: string | null, email: string): string => {
    const source = displayName || email.split('@')[0];
    return source
      .split(/[\s._-]+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Prevent rendering for guests or when viewing the login screen
  if (!user || pathname === '/login') {
    return null;
  }

  // Show loading state while fetching user info
  if (isLoading) {
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

  // Don't render if userInfo is not found
  if (!userInfo) {
    return null;
  }

  const initials = getInitials(userInfo.name!, userInfo.email);
  const shouldUseAvatarUrl = userInfo.useAvatarUrl && userInfo.avatarUrl;

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
            <Avatar>
              {shouldUseAvatarUrl && (
                <AvatarImage
                  src={userInfo.avatarUrl!}
                  alt={userInfo.name || 'User avatar'}
                />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

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

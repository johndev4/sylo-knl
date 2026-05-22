'use client';

import Image from 'next/image';

import { useEffect, useState } from 'react';
import { LogOut, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ThemeSubmenu } from '@/components/layout/theme-submenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  useAvatarUrl: boolean;
}

export function AccountDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile on mount
  useEffect(() => {
    const supabase = createClient();

    const fetchUserProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setUserProfile(null);
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/user/profile');

        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.status}`);
        }

        const data: UserProfile = await response.json();
        setUserProfile(data);
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchUserProfile();
      } else {
        setUserProfile(null);
        setIsLoading(false);
      }
    });

    // Listen for profile updates from other components (like Settings page)
    window.addEventListener('profile-updated', fetchUserProfile);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('profile-updated', fetchUserProfile);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setIsOpen(false);
      window.location.href = '/login';
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

  const initials = userProfile
    ? getInitials(userProfile.name, userProfile.email)
    : '??';
  const shouldUseAvatarUrl =
    userProfile?.useAvatarUrl && userProfile?.avatarUrl;

  // Don't render if user is not authenticated
  if (!isLoading && !userProfile) {
    return null;
  }

  return userProfile ? (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2',
            'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800',
            'border border-zinc-200 dark:border-zinc-800',
            'transition-smooth outline-none',
            'focus:ring-2 focus:ring-zinc-400/50 dark:focus:ring-zinc-600/50'
          )}
          aria-label="Account menu"
        >
          {/* Avatar */}
          {shouldUseAvatarUrl ? (
            <Image
              src={userProfile.avatarUrl!}
              alt={userProfile.name || 'User avatar'}
              width={32}
              height={32}
              unoptimized
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                'text-foreground bg-zinc-200 dark:bg-zinc-800'
              )}
            >
              {initials}
            </div>
          )}

          {/* Display Name (hidden on mobile) */}
          {!isLoading && userProfile && (
            <span className="text-foreground/80 hidden max-w-[150px] truncate text-sm sm:inline">
              {userProfile.name || userProfile.email}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* User Profile Header */}
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <div className="px-3 py-2">
          {userProfile && (
            <>
              <p className="text-foreground truncate text-sm font-semibold">
                {userProfile.name || 'User'}
              </p>
              <p className="text-foreground/60 truncate text-xs">
                {userProfile.email}
              </p>
            </>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Account Settings */}
        <DropdownMenuItem
          onClick={() => (window.location.href = '/account/settings')}
        >
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
    </DropdownMenu>
  ) : (
    <div></div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut, Settings, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Divider } from '@/components/ui/divider';
import { ThemeSubmenu } from '@/components/ThemeSubmenu';
import { cn } from '@/lib/utils';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export function AccountDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showThemeSubmenu, setShowThemeSubmenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
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
  }, []);

  // Close dropdown on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

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

  const initials = userProfile ? getInitials(userProfile.name, userProfile.email) : '??';

  // Don't render if user is not authenticated
  if (!isLoading && !userProfile) {
    return null;
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-2 py-2 rounded-lg',
          'bg-input/30 hover:bg-input/50 dark:bg-input/20 dark:hover:bg-input/30',
          'transition-colors duration-200 outline-none',
          'focus:ring-2 focus:ring-accent/50 dark:focus:ring-accent/30'
        )}
        aria-label="Account menu"
        aria-expanded={isOpen}
      >
        {/* Avatar */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
            'bg-accent/50 dark:bg-accent/40 text-foreground dark:text-foreground/90'
          )}
        >
          {initials}
        </div>

        {/* Display Name (hidden on mobile) */}
        {!isLoading && userProfile && (
          <span className="text-sm text-foreground/80 dark:text-foreground/70 hidden sm:inline max-w-[150px] truncate">
            {userProfile.name || userProfile.email}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute right-0 mt-2 w-56 rounded-lg border border-border/50 dark:border-border/30',
            'bg-background dark:bg-background/95 shadow-lg dark:shadow-2xl',
            'z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200'
          )}
          role="menu"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
        >
          {/* User Profile Header */}
          <div className="px-3 py-2 border-b border-border/30 dark:border-border/20 bg-accent/5 dark:bg-accent/10">
            <p className="text-xs font-medium text-foreground/70 dark:text-foreground/60 uppercase tracking-wider">
              Account
            </p>
            {userProfile && (
              <>
                <p className="text-sm font-semibold text-foreground dark:text-foreground/95 truncate mt-1">
                  {userProfile.name || 'User'}
                </p>
                <p className="text-xs text-foreground/60 dark:text-foreground/50 truncate">
                  {userProfile.email}
                </p>
              </>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Account Settings */}
            <a
              href="/account/settings"
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm text-foreground dark:text-foreground/90',
                'hover:bg-accent/30 dark:hover:bg-accent/20 transition-colors duration-150',
                'cursor-pointer'
              )}
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4 text-foreground/70 dark:text-foreground/60" />
              <span>Account Settings</span>
            </a>

            <Divider />

            {/* Theme Selection */}
            <button
              onClick={() => setShowThemeSubmenu(!showThemeSubmenu)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-sm',
                'text-foreground dark:text-foreground/90 hover:bg-accent/30 dark:hover:bg-accent/20',
                'transition-colors duration-150 cursor-pointer'
              )}
              role="menuitem"
              aria-haspopup="true"
              aria-expanded={showThemeSubmenu}
            >
              <span>Theme</span>
              <ChevronRight
                className={cn(
                  'w-4 h-4 text-foreground/60 dark:text-foreground/50 transition-transform',
                  showThemeSubmenu && 'rotate-90'
                )}
              />
            </button>

            {/* Theme Submenu */}
            {showThemeSubmenu && (
              <div className="px-2 py-1 bg-accent/5 dark:bg-accent/10 border-t border-border/20 dark:border-border/10">
                <ThemeSubmenu />
              </div>
            )}

            <Divider />

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm',
                'text-destructive dark:text-red-400 hover:bg-destructive/10 dark:hover:bg-destructive/20',
                'transition-colors duration-150 cursor-pointer'
              )}
              role="menuitem"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

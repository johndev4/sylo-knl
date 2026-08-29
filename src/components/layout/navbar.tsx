'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '../ui/navigation-menu';

interface NavbarProps {
  user: User | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

  const showNav = !!user && pathname !== '/login';
  if (!showNav) {
    return null;
  }

  return (
    <>
      <NavigationMenu className="ml-4 hidden items-center gap-1 md:flex">
        <NavigationMenuList className="">
          {/* Hub Nav Item */}
          <NavigationMenuItem className="hidden md:flex">
            <NavigationMenuLink
              render={<Link href="/hub">Hub</Link>}
              className={navigationMenuTriggerStyle({
                className: cn(
                  'focus-visible:ring-ring mr-1 px-3 text-sm font-medium transition-colors focus-visible:ring-1 focus-visible:outline-none',
                  pathname.startsWith('/hub')
                    ? 'text-foreground bg-zinc-100 dark:bg-zinc-800/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30'
                ),
              })}
            />
          </NavigationMenuItem>

          {/* Chat Nav Item */}
          <NavigationMenuItem className="hidden md:flex">
            <NavigationMenuLink
              render={<Link href="/chat">Chat</Link>}
              className={navigationMenuTriggerStyle({
                className: cn(
                  'focus-visible:ring-ring mx-auto px-3 text-sm font-medium transition-colors focus-visible:ring-1 focus-visible:outline-none',
                  pathname.startsWith('/chat')
                    ? 'text-foreground bg-zinc-100 dark:bg-zinc-800/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30'
                ),
              })}
            />
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </>
  );
}

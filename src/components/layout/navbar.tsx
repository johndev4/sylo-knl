'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '../ui/navigation-menu';
import { useSession } from '../providers/auth-provider';

export function Navbar() {
  const { user } = useSession();
  const pathname = usePathname();

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Prevent rendering for guests or when viewing the login screen
  if (!user || pathname === '/login') {
    return null;
  }

  return (
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
                  ? 'text-foreground bg-neutral-100 dark:bg-neutral-800/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30'
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
                  ? 'text-foreground bg-neutral-100 dark:bg-neutral-800/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30'
              ),
            })}
          />
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';

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
    <div className="ml-4 hidden items-center gap-1 md:flex">
      {/* Library Hub Nav Item */}
      <Link
        href="/hub"
        className={cn(
          'focus-visible:ring-ring rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-1 focus-visible:outline-none',
          pathname === '/hub' ||
            (pathname.startsWith('/hub/') && !pathname.startsWith('/chat'))
            ? 'text-foreground bg-zinc-100 dark:bg-zinc-800/50'
            : 'text-muted-foreground hover:text-foreground hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30'
        )}
      >
        Library Hub
      </Link>
      {/* Chat Nav Item */}
      <Link
        href="/chat"
        className={cn(
          'focus-visible:ring-ring rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-1 focus-visible:outline-none',
          pathname.startsWith('/chat')
            ? 'text-foreground bg-zinc-100 dark:bg-zinc-800/50'
            : 'text-muted-foreground hover:text-foreground hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30'
        )}
      >
        Chat
      </Link>
    </div>
  );
}

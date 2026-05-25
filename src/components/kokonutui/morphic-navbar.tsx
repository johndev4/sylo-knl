'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
}

interface MorphicNavbarProps {
  items?: Record<string, NavItem>;
  className?: string;
}

const DEFAULT_NAV_ITEMS: Record<string, NavItem> = {
  '/hub': { name: 'Library Hub' },
  '/hub/chat': { name: 'Chat' },
};

export function MorphicNavbar({
  items = DEFAULT_NAV_ITEMS,
  className,
}: MorphicNavbarProps) {
  const pathname = usePathname();

  const getIsActive = (path: string) => {
    if (path === '/hub') {
      // Matches /hub or subpaths, but not /hub/chat
      return (
        pathname === '/hub' ||
        (pathname.startsWith('/hub/') && !pathname.startsWith('/hub/chat'))
      );
    }
    if (path === '/hub/chat') {
      return pathname.startsWith('/hub/chat');
    }
    return pathname === path;
  };

  return (
    <nav
      className={cn(
        'relative flex items-center gap-1 rounded-xl border border-zinc-200/50 bg-zinc-100/50 p-1 dark:border-zinc-800/50 dark:bg-zinc-900/50',
        className
      )}
    >
      {Object.entries(items).map(([path, { name }]) => {
        const isActive = getIsActive(path);

        return (
          <Link
            key={path}
            href={path}
            className={cn(
              'relative rounded-lg px-4 py-1.5 text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600',
              isActive
                ? 'text-zinc-900 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="active-tab-background"
                className="absolute inset-0 rounded-lg border border-zinc-200/60 bg-white shadow-sm dark:border-zinc-800/50 dark:bg-zinc-950"
                style={{ originY: '0px' }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default MorphicNavbar;

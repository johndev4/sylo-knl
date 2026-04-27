'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LibraryNavProps {
  libraryId: string;
  currentSection?: 'documents' | 'chat' | 'settings';
}

export default function LibraryNav({
  libraryId,
  currentSection,
}: LibraryNavProps) {
  const pathname = usePathname();

  // More robust way to determine active section from pathname
  const segments = pathname?.split('/') || [];
  const lastSegment = segments[segments.length - 1];
  const activeSection =
    currentSection ??
    (['documents', 'chat', 'settings'].includes(lastSegment)
      ? lastSegment
      : 'documents');

  const navItems = [
    {
      href: `/hub/${libraryId}/documents`,
      label: 'Documents',
      id: 'documents',
    },
    {
      href: `/hub/${libraryId}/chat`,
      label: 'Chat',
      id: 'chat',
    },
    {
      href: `/hub/${libraryId}/settings`,
      label: 'Settings',
      id: 'settings',
    },
  ];

  return (
    <div className="no-scrollbar overflow-x-auto py-1">
      <nav
        aria-label="Library sections"
        className="bg-muted/40 border-border/50 inline-flex min-w-max items-center rounded-xl border p-1 backdrop-blur-sm"
      >
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'focus-visible:ring-ring relative rounded-lg px-6 py-2 text-sm font-medium transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab-pill"
                  className="bg-background shadow-soft-sm border-border/10 absolute inset-0 rounded-lg border"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WorkspaceNavProps {
  workspaceId: string;
  currentSection?: 'documents' | 'chat' | 'settings';
}

export default function WorkspaceNav({
  workspaceId,
  currentSection,
}: WorkspaceNavProps) {
  const pathname = usePathname();
  
  // More robust way to determine active section from pathname
  const segments = pathname?.split('/') || [];
  const lastSegment = segments[segments.length - 1];
  const activeSection = currentSection ?? (['documents', 'chat', 'settings'].includes(lastSegment) ? lastSegment : 'documents');

  const navItems = [
    {
      href: `/spaces/${workspaceId}/documents`,
      label: 'Documents',
      id: 'documents',
    },
    {
      href: `/spaces/${workspaceId}/chat`,
      label: 'Chat',
      id: 'chat',
    },
    {
      href: `/spaces/${workspaceId}/settings`,
      label: 'Settings',
      id: 'settings',
    },
  ];

  return (
    <div className="overflow-x-auto no-scrollbar py-1">
      <nav aria-label="Workspace sections" className="inline-flex items-center p-1 bg-muted/40 rounded-xl border border-border/50 backdrop-blur-sm min-w-max">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "relative px-6 py-2 text-sm font-medium transition-all duration-300 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                isActive 
                  ? "text-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab-pill"
                  className="absolute inset-0 bg-background shadow-soft-sm rounded-lg border border-border/10"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
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

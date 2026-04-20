'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WorkspaceNavProps {
  workspaceId: string;
  currentSection?: 'documents' | 'chat' | 'settings';
}

/**
 * Optional: Workspace Navigation Component
 * Add this to your workspace layout for easy navigation between sections
 * 
 * Usage:
 * <WorkspaceNav workspaceId={workspaceId} currentSection="documents" />
 */
export default function WorkspaceNav({
  workspaceId,
  currentSection = 'documents',
}: WorkspaceNavProps) {
  const pathname = usePathname();

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
    <nav className="flex gap-2 border-b border-border">
      {navItems.map((item) => (
        <Link key={item.id} href={item.href}>
          <Button
            variant={currentSection === item.id ? 'default' : 'ghost'}
            className={cn(
              'rounded-none border-b-2 border-transparent transition-all',
              currentSection === item.id && 'border-primary'
            )}
          >
            {item.label}
          </Button>
        </Link>
      ))}
    </nav>
  );
}

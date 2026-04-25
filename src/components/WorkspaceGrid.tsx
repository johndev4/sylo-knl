'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

type Membership = {
  role: string;
  workspace: { id: string; name: string; created_at: string };
  memberCount: number;
  docCount: number;
};

interface WorkspaceGridProps {
  memberships: Membership[];
}

export function WorkspacesBentoGrid({ memberships }: WorkspaceGridProps) {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: prefersReducedMotion ? 0 : 0.15,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.35,
        ease: 'easeOut' as const,
      },
    },
    hover: {
      y: prefersReducedMotion ? 0 : -6,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.2,
        ease: 'easeInOut' as const,
      },
    },
  };

  return (
    <section aria-label="Workspace dashboard" className="w-full">
      <motion.div
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {memberships.map((membership) => {
          const space = membership.workspace;

          return (
            <motion.article
              key={space.id}
              variants={cardVariants}
              whileHover="hover"
              className="group h-full transition-transform duration-300 ease-out"
            >
              <Card className="relative flex h-full flex-col overflow-hidden border border-zinc-200 bg-white/90 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-950/95 dark:hover:border-zinc-700">
                <CardHeader className="space-y-2 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 overflow-hidden">
                      <CardTitle className="truncate text-xl font-semibold text-foreground">
                        {space.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-zinc-500 dark:text-zinc-400">
                        {membership.role} access
                      </CardDescription>
                    </div>
                    <div className="shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      {membership.role}
                    </div>
                  </div>

                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Created {new Date(space.created_at).toLocaleDateString()} · {membership.memberCount} members · {membership.docCount} docs
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col justify-between gap-6 pb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-950 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Members</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{membership.memberCount}</p>
                    </div>
                    <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-950 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Documents</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{membership.docCount}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-auto">
                    <Button asChild variant="default" className="w-full" size="sm" aria-label={`Open chat for ${space.name}`}>
                      <a href={`/workspaces/${space.id}/chat`}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Chat
                      </a>
                    </Button>

                    {membership.role !== 'VIEWER' ? (
                      <Button asChild variant="outline" className="w-full" size="sm" aria-label={`View documents for ${space.name}`}>
                        <a href={`/workspaces/${space.id}/documents`}>
                          <FileText className="mr-2 h-4 w-4" />
                          Docs
                        </a>
                      </Button>
                    ) : (
                      <div />
                    )}

                    {(membership.role === 'OWNER' || membership.role === 'ADMIN') ? (
                      <Button asChild variant="outline" className="w-full" size="sm" aria-label={`Open settings for ${space.name}`}>
                        <a href={`/workspaces/${space.id}/settings`}>
                          <Settings className="mr-2 h-4 w-4" />
                          Manage
                        </a>
                      </Button>
                    ) : (
                      <div />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.article>
          );
        })}
      </motion.div>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, FileText } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { HydrationSafeDate } from '@/components/shared/hydration-safe-date';

type Membership = {
  role: string;
  library: { id: string; name: string; created_at: string };
  memberCount: number;
  docCount: number;
};

interface LibraryGridProps {
  hubData: Membership[];
}

export function LibrariesBentoGrid({ hubData }: LibraryGridProps) {
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
    <>
      <section aria-label="Library dashboard" className="w-full">
        <motion.div
          className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {hubData.map((dataItem, index) => {
            const space = dataItem.library;
            const isFeatured = index === 0 && hubData.length > 2;

            return (
              <motion.article
                key={space.id}
                variants={cardVariants}
                whileHover="hover"
                className={cn(
                  'group h-full transition-transform duration-300 ease-out',
                  isFeatured ? 'md:col-span-2' : ''
                )}
              >
                <Card className="relative flex h-full flex-col overflow-hidden border border-neutral-200/50 bg-white/60 shadow-sm backdrop-blur-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-neutral-300/50 hover:shadow-lg dark:border-neutral-800/50 dark:bg-neutral-950/60 dark:hover:border-neutral-700/50">
                  <CardContent className="space-y-2 pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <CardTitle className="text-foreground truncate text-xl font-semibold">
                          {space.name}
                        </CardTitle>
                        <CardDescription className="text-sm text-neutral-500 dark:text-neutral-400">
                          <div className="w-fit shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
                            {dataItem.role}
                          </div>
                        </CardDescription>
                      </div>
                    </div>

                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      Created <HydrationSafeDate value={space.created_at} />{' '}
                      &middot; {dataItem.memberCount} members &middot;{' '}
                      {dataItem.docCount} docs
                    </div>
                    <div
                      className={cn(
                        'mt-auto grid gap-2',
                        isFeatured ? 'grid-cols-2 sm:w-2/3' : 'grid-cols-2'
                      )}
                    >
                      <Button
                        render={
                          <Link href={`/chat?libraryIds=${space.id}`}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Chat
                          </Link>
                        }
                        variant="default"
                        className="h-11 w-full sm:h-8"
                        size="sm"
                        aria-label={`Open chat for ${space.name}`}
                        onClick={(e) => e.stopPropagation()}
                      />

                      <Button
                        render={
                          <Link href={`/hub/libraries/${space.id}/documents`}>
                            <FileText className="mr-2 h-4 w-4" />
                            Docs
                          </Link>
                        }
                        variant="outline"
                        className="h-11 w-full sm:h-8"
                        size="sm"
                        aria-label={`View documents for ${space.name}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.article>
            );
          })}
        </motion.div>
      </section>
    </>
  );
}

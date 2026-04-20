'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

export function WorkspaceGrid({ memberships }: WorkspaceGridProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      {/* ── Workspace cards grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
        {memberships.map((membership) => {
          const space = membership.workspace;

          return (
            <Card
              key={space.id}
              className={cn(
                'relative transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-lg sm:text-base">{space.name}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">{membership.role} Access</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-3">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-2">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Members</p>
                    <p className="text-lg font-semibold">{membership.memberCount}</p>
                  </div>
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-2">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Documents</p>
                    <p className="text-lg font-semibold">{membership.docCount}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2">
                  <Link href={`/spaces/${space.id}/chat`} className="w-full">
                    <Button 
                      variant="default" 
                      className="w-full justify-center gap-2" 
                      size="sm"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Chat</span>
                    </Button>
                  </Link>
                  {membership.role !== 'VIEWER' && (
                    <Link href={`/spaces/${space.id}/documents`} className="w-full">
                      <Button 
                        variant="outline" 
                        className="w-full justify-center gap-2" 
                        size="sm"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Documents</span>
                      </Button>
                    </Link>
                  )}
                  {(membership.role === 'OWNER' || membership.role === 'ADMIN') && (
                    <Link href={`/spaces/${space.id}/settings`} className="w-full">
                      <Button 
                        variant="outline" 
                        className="w-full justify-center gap-2" 
                        size="sm"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

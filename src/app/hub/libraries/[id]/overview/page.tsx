'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  VIEWER: 'You can view documents in this library.',
  EDITOR: 'You can view, create, and edit documents in this library.',
};

export default function LibraryInfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [libraryId, setLibraryId] = useState('');
  const [libraryName, setLibraryName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [memberCount, setMemberCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [createdAt, setCreatedAt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setLibraryId(resolvedParams.id);
    };
    loadParams();
  }, [params]);

  useEffect(() => {
    if (!libraryId) return;

    const loadLibraryInfo = async () => {
      try {
        setIsLoading(true);
        setError('');

        const [libraryRes, membersRes, documentsRes] = await Promise.all([
          fetch(`/api/libraries/${libraryId}`),
          fetch(`/api/libraries/${libraryId}/members`),
          fetch(`/api/documents?libraryId=${libraryId}&limit=1&page=1`),
        ]);

        if (!libraryRes.ok) {
          throw new Error('Failed to load library details');
        }

        const libraryData = await libraryRes.json();
        setLibraryName(libraryData.library?.name ?? '');
        setUserRole(libraryData.role ?? '');
        setCreatedAt(libraryData.library?.created_at ?? '');

        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMemberCount(
            Array.isArray(membersData.data) ? membersData.data.length : 0
          );
        }

        if (documentsRes.ok) {
          const documentsData = await documentsRes.json();
          setDocumentCount(documentsData.metadata?.total ?? 0);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load library info'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadLibraryInfo();
  }, [libraryId]);

  const formattedCreatedAt = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-6">
      <div className="mb-8 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
            <p className="text-muted-foreground">
              View details about this library
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center">Loading...</div>
      ) : (
        <Card className="space-y-4 p-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              {libraryName || 'Library'}
            </h2>
            <p className="text-muted-foreground text-sm">
              Overview of this library and your access
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Library ID</Label>
              <Input value={libraryId} disabled className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-sm font-medium">Created</Label>
              <Input
                value={formattedCreatedAt}
                disabled
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Your Role</Label>
              <Input value={userRole} disabled className="mt-1 text-sm" />
              {ROLE_DESCRIPTIONS[userRole] && (
                <p className="text-muted-foreground mt-2 text-sm">
                  {ROLE_DESCRIPTIONS[userRole]}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Members</Label>
              <Input
                value={`${memberCount} / 11`}
                disabled
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Documents</Label>
              <Input
                value={`${documentCount} / 500`}
                disabled
                className="mt-1 text-sm"
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

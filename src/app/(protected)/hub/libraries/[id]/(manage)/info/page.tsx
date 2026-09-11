import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requireLibraryRole } from '@/lib/auth/library-role';
import { notFound } from 'next/navigation';
import { getLibraryOverview } from '@/features/library/queries';
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { LibraryOverviewContentLoading } from './loading';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  VIEWER: 'You can view documents in this library.',
  EDITOR: 'You can view, create, and edit documents in this library.',
  ADMIN:
    'You can view, create, edit documents, and manage members in this library.',
  OWNER: 'You have full administrative access to this library.',
};

export default async function LibraryOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await requireLibraryRole(id);
  if (!membership) return notFound();

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-6">
      <Suspense fallback={<LibraryOverviewContentLoading />}>
        <LibraryOverviewContent libraryId={id} userRole={membership.role} />
      </Suspense>
    </div>
  );
}

async function LibraryOverviewContent({
  libraryId,
  userRole,
}: {
  libraryId: string;
  userRole: string;
}) {
  const supabase = await createClient();
  const { library, memberCount, documentCount } = await getLibraryOverview(
    libraryId,
    supabase
  );

  const libraryName = library?.name ?? '';
  const createdAt = library?.created_at ?? '';

  const formattedCreatedAt = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  return (
    <>
      <Card className="space-y-4 p-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{libraryName || 'Library'}</h2>
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
            {userRole && ROLE_DESCRIPTIONS[userRole] && (
              <p className="text-muted-foreground mt-2 text-sm">
                {ROLE_DESCRIPTIONS[userRole]}
              </p>
            )}
          </div>
          <div>
            <Label className="text-sm font-medium">Members</Label>
            <Input
              value={`${memberCount ?? 0} / 11`}
              disabled
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Documents</Label>
            <Input
              value={`${documentCount ?? 0} / 500`}
              disabled
              className="mt-1 text-sm"
            />
          </div>
        </div>
      </Card>
    </>
  );
}

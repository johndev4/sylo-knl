import { guardLibraryAccess } from '@/lib/actions/guard-library-access';
import { fetchLibraryOverview } from '@/lib/actions/libraries';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Suspense } from 'react';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  VIEWER: 'You can view documents in this library.',
  EDITOR: 'You can view, create, and edit documents in this library.',
  ADMIN:
    'You can view, create, edit documents, and manage members in this library.',
  OWNER: 'You have full administrative access to this library.',
};

export default async function LibraryInfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 py-8 text-center text-sm">
          Loading overview…
        </div>
      }
    >
      <LibraryInfoPageContent params={params} />
    </Suspense>
  );
}

async function LibraryInfoPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const denied = await guardLibraryAccess(id);
  if (denied) return denied;

  const { library, memberCount, documentCount, membership } = await fetchLibraryOverview(id);

  const libraryName = library?.name ?? '';
  const userRole = membership?.role ?? '';
  const createdAt = library?.created_at ?? '';

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
            <Input value={id} disabled className="mt-1 text-sm" />
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
    </div>
  );
}

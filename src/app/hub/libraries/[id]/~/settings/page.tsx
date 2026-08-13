import {
  LIBRARY_ROLES,
  requireLibraryRole,
} from '@/lib/helpers/require-library-role';
import { getLibraryName } from '@/actions/libraries';
import { DeleteLibraryForm, RenameLibraryForm } from './_components';
import { Suspense } from 'react';
import { unauthorized } from 'next/navigation';

export default async function LibrarySettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 py-8 text-center text-sm">
          Loading settings…
        </div>
      }
    >
      <LibrarySettingsPageContent params={params} />
    </Suspense>
  );
}

async function LibrarySettingsPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await requireLibraryRole(id, LIBRARY_ROLES.ADMIN);
  if (!membership) return unauthorized();

  const libraryName = await getLibraryName(id);
  const currentUserRole = membership?.role ?? '';
  const canManageMembers = ['OWNER', 'ADMIN'].includes(currentUserRole);

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Library Settings
            </h1>
            <p className="text-muted-foreground">Manage library settings</p>
          </div>
        </div>
      </div>

      {canManageMembers && (
        <RenameLibraryForm libraryId={id} initialName={libraryName} />
      )}

      {currentUserRole === 'OWNER' && (
        <DeleteLibraryForm
          libraryId={id}
          libraryName={libraryName || 'this library'}
        />
      )}
    </div>
  );
}

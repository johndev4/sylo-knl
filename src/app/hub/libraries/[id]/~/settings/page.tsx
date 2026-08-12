import { guardLibraryAccess } from '@/lib/actions/guard-library-access';
import {
  LIBRARY_ROLES,
  requireLibraryRole,
} from '@/lib/actions/require-library-role';
import { getLibraryName } from '@/lib/actions/libraries';
import { DeleteLibraryForm, RenameLibraryForm } from './_components';
import { Suspense } from 'react';

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
  const denied = await guardLibraryAccess(id, LIBRARY_ROLES.ADMIN);
  if (denied) return denied;

  const [libraryName, membership] = await Promise.all([
    getLibraryName(id),
    requireLibraryRole(id, LIBRARY_ROLES.ADMIN),
  ]);
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

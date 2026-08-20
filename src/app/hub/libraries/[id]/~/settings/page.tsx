import { LIBRARY_ROLES, requireLibraryRole } from '@/lib/auth/library-role';
import {
  DeleteLibraryForm,
  RenameLibraryForm,
} from '@/features/libraries';
import { Suspense } from 'react';
import { forbidden, notFound } from 'next/navigation';
import { getLibraryName } from '@/queries/libraries';
import { createClient } from '@/lib/supabase/server';
import { Spinner } from '@/components/ui/spinner';

export default async function LibrarySettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center p-8 py-8 text-center text-sm">
          <Spinner className="text-muted-foreground h-8 w-8" />
          Loading…
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
  const membership = await requireLibraryRole(id);
  if (!membership) return notFound();

  const adminMembership = await requireLibraryRole(id, LIBRARY_ROLES.ADMIN);
  if (!adminMembership) return forbidden();

  const supabase = await createClient();
  const libraryName = await getLibraryName(id, supabase);
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

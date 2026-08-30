import { LIBRARY_ROLES, requireLibraryRole } from '@/lib/auth/library-role';
import {
  DeleteLibraryForm,
  RenameLibraryForm,
} from '@/features/library/components';
import { forbidden, notFound } from 'next/navigation';
import { getLibraryName } from '@/features/library/queries';
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { LibrarySettingsContentLoading } from './loading';

export default async function LibrarySettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await requireLibraryRole(id);
  if (!membership) return notFound();

  const adminMembership = await requireLibraryRole(id, LIBRARY_ROLES.ADMIN);
  if (!adminMembership) return forbidden();

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-6">
      <Suspense fallback={<LibrarySettingsContentLoading />}>
        <LibrarySettingsContent
          libraryId={id}
          userRole={adminMembership.role}
        />
      </Suspense>
    </div>
  );
}

async function LibrarySettingsContent({
  libraryId,
  userRole,
}: {
  libraryId: string;
  userRole: string;
}) {
  const supabase = await createClient();
  const libraryName = await getLibraryName(libraryId, supabase);
  const canManageMembers = ['OWNER', 'ADMIN'].includes(userRole);

  return (
    <>
      {canManageMembers && (
        <RenameLibraryForm libraryId={libraryId} initialName={libraryName} />
      )}

      {userRole === 'OWNER' && (
        <DeleteLibraryForm libraryId={libraryId} libraryName={libraryName} />
      )}
    </>
  );
}

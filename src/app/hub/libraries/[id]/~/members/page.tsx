import { InviteSection, MemberTable } from '@/components/features/libraries';
import { Suspense } from 'react';
import { requireLibraryRole } from '@/lib/auth/library-role';
import { forbidden } from 'next/navigation';
import { getLibraryMembers } from '@/queries/libraries';
import { createClient } from '@/lib/supabase/server';
import { Spinner } from '@/components/ui/spinner';

export default async function LibraryMembersPage({
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
      <LibraryMembersPageContent params={params} />
    </Suspense>
  );
}

async function LibraryMembersPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await requireLibraryRole(id);
  if (!membership) return forbidden();

  const currentUserRole = membership?.role || '';
  const isOwnerOrHasAdminRole = ['OWNER', 'ADMIN'].includes(currentUserRole);

  const supabase = await createClient();
  const members = await getLibraryMembers(id, supabase, membership);

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Library Members
            </h1>
            <p className="text-muted-foreground">Manage library members</p>
          </div>
        </div>
      </div>

      {/* Members List Section */}
      <MemberTable
        libraryId={id}
        members={members}
        canManageMembers={isOwnerOrHasAdminRole}
      />

      {/* Invite Links Section */}
      {isOwnerOrHasAdminRole && (
        <InviteSection libraryId={id} membership={membership} />
      )}
    </div>
  );
}

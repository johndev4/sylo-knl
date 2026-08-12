import { guardLibraryAccess } from '@/lib/actions/guard-library-access';
import { fetchLibraryMembers } from '@/lib/actions/libraries';
import { createClient } from '@/lib/supabase/server';
import { InviteSection, MemberTable } from './_components';
import { Suspense } from 'react';
import { LibraryMember } from './_components/member-table';

export default async function LibraryMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 py-8 text-center text-sm">
          Loading members…
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
  const denied = await guardLibraryAccess(id);
  if (denied) return denied;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const members = await fetchLibraryMembers(id);

  const currentMember = members.find(
    (m: LibraryMember) => m.user_id === user?.id
  );
  const currentUserRole = currentMember?.role || '';
  const canManageMembers = ['OWNER', 'ADMIN'].includes(currentUserRole);

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
        currentUserRole={currentUserRole}
        canManageMembers={canManageMembers}
      />

      {/* Invite Links Section */}
      {canManageMembers && <InviteSection libraryId={id} />}
    </div>
  );
}

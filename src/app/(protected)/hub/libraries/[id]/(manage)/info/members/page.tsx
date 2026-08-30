import { InviteSection, MemberTable } from '@/features/library/components';
import { Suspense } from 'react';
import { requireLibraryRole } from '@/lib/auth/library-role';
import { notFound } from 'next/navigation';
import {
  getLibraryInvites,
  getLibraryMembers,
} from '@/features/library/queries';
import { createClient } from '@/lib/supabase/server';
import { MemberTableSkeleton, InviteSectionSkeleton } from './loading';

interface InviteSectionProps {
  libraryId: string;
  membership: { role: string } | null;
}

interface MemberTableProps {
  libraryId: string;
  membership: { role: string } | null;
  isOwnerOrHasAdminRole: boolean;
}

export default async function LibraryMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await requireLibraryRole(id);
  if (!membership) return notFound();

  const currentUserRole = membership?.role || '';
  const isOwnerOrHasAdminRole = ['OWNER', 'ADMIN'].includes(currentUserRole);

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-6">
      {/* Members List Section */}
      <Suspense fallback={<MemberTableSkeleton />}>
        <MemberTableAsync
          libraryId={id}
          membership={membership}
          isOwnerOrHasAdminRole={isOwnerOrHasAdminRole}
        />
      </Suspense>

      {/* Invite Links Section */}
      {isOwnerOrHasAdminRole && (
        <Suspense fallback={<InviteSectionSkeleton />}>
          <InviteSectionAsync libraryId={id} membership={membership} />
        </Suspense>
      )}
    </div>
  );
}

async function MemberTableAsync({
  libraryId,
  membership,
  isOwnerOrHasAdminRole,
}: MemberTableProps) {
  const supabase = await createClient();
  const members = await getLibraryMembers(libraryId, supabase, membership);

  return (
    <MemberTable
      libraryId={libraryId}
      members={members}
      canManageMembers={isOwnerOrHasAdminRole}
    />
  );
}

async function InviteSectionAsync({
  libraryId,
  membership,
}: InviteSectionProps) {
  const supabase = await createClient();
  const invites = await getLibraryInvites(libraryId, supabase, membership);

  return <InviteSection libraryId={libraryId} initialInvites={invites} />;
}

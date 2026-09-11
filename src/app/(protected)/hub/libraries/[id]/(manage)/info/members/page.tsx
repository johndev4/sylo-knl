import { InviteSection, MemberTable } from '@/features/library/components';
import { requireLibraryRole } from '@/lib/auth/library-role';
import { notFound } from 'next/navigation';

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
      <MemberTable libraryId={id} canManageMembers={isOwnerOrHasAdminRole} />

      {/* Invite Links Section */}
      {isOwnerOrHasAdminRole && <InviteSection libraryId={id} />}
    </div>
  );
}

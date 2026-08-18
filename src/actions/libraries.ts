'use server';

import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Allows a user to leave a library they are a member of.
 * Library owners cannot leave and must transfer ownership or delete the library first.
 *
 * @param libraryId - The unique identifier of the library to leave
 */
export async function leaveLibrary(libraryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { data: membership, error: membershipError } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', user.id)
    .single();

  if (membershipError || !membership) {
    throw new Error('Not a member of this library');
  }

  if (membership.role === 'OWNER') {
    throw new Error(
      'Library owner cannot leave. Delete or transfer ownership first.'
    );
  }

  const { error } = await supabase.rpc('leave_library', {
    p_library_id: libraryId,
  });

  if (error) {
    throw new Error(error.message || 'Failed to leave library');
  }

  revalidatePath('/hub');
  return { success: true };
}

/**
 * Creates a new library with the current user as the owner.
 * Checks for duplicate library names (case-insensitive) within the user's existing libraries.
 *
 * @param name - The name of the library to create
 */
export async function createLibrary(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // Duplicate name check — scoped to this user's existing libraries (case-insensitive)
  const { data: existing } = await supabase
    .from('library_members')
    .select('library:libraries(name)')
    .eq('user_id', user.id);

  const duplicate = (existing ?? []).some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any) => m.library?.name?.toLowerCase() === name.trim().toLowerCase()
  );

  if (duplicate) {
    throw new Error(`A library named "${name.trim()}" already exists.`);
  }

  // Create library and owner membership atomically via RPC
  const { data, error } = await supabase.rpc('create_library_with_owner', {
    w_name: name,
  });

  if (error) {
    throw new Error(error.message || 'Failed to create library');
  }

  const library = data as { id: string; name: string };

  revalidatePath('/hub');
  return library;
}

/**
 * Deletes a library by ID.
 * Only the library owner can delete the library (enforced by RLS).
 *
 * @param libraryId - The unique identifier of the library to delete
 */
export async function deleteLibrary(libraryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // RLS will ensure only OWNER can delete
  const { error } = await supabase
    .from('libraries')
    .delete()
    .eq('id', libraryId);

  if (error) throw new Error(error.message || 'Failed to delete library');

  revalidatePath('/hub');
  return { success: true };
}

/**
 * Deletes multiple libraries by their IDs.
 * Only libraries where the user is the owner will be deleted (enforced by RLS).
 *
 * @param ids - Array of library IDs to delete
 */
export async function deleteLibraries(ids: string[]) {
  if (!ids.length) return { success: true };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // RLS ensures only libraries where user is OWNER are deleted
  const { error } = await supabase.from('libraries').delete().in('id', ids);

  if (error) throw new Error(error.message || 'Failed to delete libraries');

  revalidatePath('/hub');
  return { success: true };
}

/**
 * Updates the name of a library.
 * Only library owners and admins can rename the library.
 *
 * @param libraryId - The unique identifier of the library to rename
 * @param newName - The new name for the library
 */
export async function updateLibraryName(libraryId: string, newName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // Check if requester is OWNER or ADMIN of library
  const { data: membership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', user.id)
    .single();

  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new Error('Only owners and admins can rename the library');
  }

  const { error } = await supabase
    .from('libraries')
    .update({ name: newName.trim() })
    .eq('id', libraryId);

  if (error) {
    console.error('Failed to update library name:', error);
    throw new Error(error.message || 'Failed to update library name');
  }

  revalidatePath(`/hub/libraries/${libraryId}/settings`);
  revalidatePath('/hub');
  return { success: true };
}

/**
 * Updates the role of an existing library member.
 * Only library owners and admins can modify member roles.
 * Prevents demoting the only owner of a library.
 *
 * @param libraryId - The unique identifier of the library
 * @param userId - The unique identifier of the user whose role to update
 * @param role - The new role to assign (ADMIN, EDITOR, or VIEWER)
 */
export async function updateLibraryMemberRole(
  libraryId: string,
  userId: string,
  role: 'ADMIN' | 'EDITOR' | 'VIEWER'
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // Check if requester is OWNER or ADMIN of library
  const { data: requesterMembership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', user.id)
    .single();

  if (
    !requesterMembership ||
    !['OWNER', 'ADMIN'].includes(requesterMembership.role)
  ) {
    throw new Error('Only owners and admins can modify member roles');
  }

  // Check target member
  const { data: targetMembership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', userId)
    .single();

  if (!targetMembership) throw new Error('Member not found in library');

  // Prevent demoting the only OWNER
  if (targetMembership.role === 'OWNER') {
    const { data: otherOwners } = await supabase
      .from('library_members')
      .select('user_id')
      .eq('library_id', libraryId)
      .eq('role', 'OWNER')
      .neq('user_id', userId);

    if (!otherOwners || otherOwners.length === 0) {
      throw new Error('Cannot demote the only owner of the library');
    }
  }

  // Update
  const { data: updatedMember, error } = await supabase
    .from('library_members')
    .update({ role })
    .eq('library_id', libraryId)
    .eq('user_id', userId)
    .select(
      `
      library_id,
      user_id,
      role,
      created_at,
      user:user_id(id, name, email, avatar_url)
    `
    )
    .single();

  if (error) {
    console.error('Failed to update member role:', error);
    throw new Error('Failed to update member role');
  }

  revalidatePath(`/hub/libraries/${libraryId}`);
  return updatedMember;
}

/**
 * Removes a member from a library.
 * Only library owners and admins can remove members.
 * Prevents removing the only owner of a library.
 *
 * @param libraryId - The unique identifier of the library
 * @param userId - The unique identifier of the user to remove
 */
export async function removeLibraryMember(libraryId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // Check requester
  const { data: requesterMembership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', user.id)
    .single();

  if (
    !requesterMembership ||
    !['OWNER', 'ADMIN'].includes(requesterMembership.role)
  ) {
    throw new Error('Only owners and admins can remove members');
  }

  // Check target
  const { data: targetMembership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', userId)
    .single();

  if (!targetMembership) throw new Error('Member not found');

  // Prevent removing only owner
  if (targetMembership.role === 'OWNER') {
    const { data: otherOwners } = await supabase
      .from('library_members')
      .select('user_id')
      .eq('library_id', libraryId)
      .eq('role', 'OWNER')
      .neq('user_id', userId);

    if (!otherOwners || otherOwners.length === 0) {
      throw new Error('Cannot remove the only owner');
    }
  }

  const { error } = await supabase
    .from('library_members')
    .delete()
    .eq('library_id', libraryId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to remove member:', error);
    throw new Error('Failed to remove member');
  }

  revalidatePath(`/hub/libraries/${libraryId}`);
  return { success: true };
}

/**
 * Removes multiple members from a library in a batch operation.
 * Uses Promise.allSettled to attempt removal of all members and reports failures.
 *
 * @param libraryId - The unique identifier of the library
 * @param userIds - Array of user IDs to remove from the library
 */
export async function removeMultipleLibraryMembers(
  libraryId: string,
  userIds: string[]
) {
  const results = await Promise.allSettled(
    userIds.map((userId) => removeLibraryMember(libraryId, userId))
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    throw new Error(`Failed to remove ${failed.length} member(s)`);
  }

  revalidatePath(`/hub/libraries/${libraryId}`);
  return { success: true, removedCount: userIds.length };
}

/**
 * Creates a new invite link for a library.
 * Only library owners and admins can create invites.
 * Generates a unique 8-character invite code.
 *
 * @param libraryId - The unique identifier of the library
 * @param role - The role to assign to users who join via this invite (VIEWER or EDITOR)
 * @param expiresAt - Optional expiration date/time for the invite
 * @param maxUses - Optional maximum number of times the invite can be used
 */
export async function createLibraryInvite(
  libraryId: string,
  role: 'VIEWER' | 'EDITOR',
  expiresAt?: string | null,
  maxUses?: number | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { data: membership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', user.id)
    .single();

  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new Error('Only owners and admins can create invites');
  }

  // Generate invite code
  const inviteCode = crypto
    .randomBytes(6)
    .toString('base64url')
    .substring(0, 8);

  const { data: invite, error } = await supabase
    .from('library_invites')
    .insert({
      library_id: libraryId,
      invite_code: inviteCode,
      role,
      created_by: user.id,
      expires_at: expiresAt || null,
      max_uses: maxUses || null,
    })
    .select()
    .single();

  if (error || !invite) {
    console.error('Failed to create invite:', error);
    throw new Error('Failed to create invite');
  }

  revalidatePath(`/hub/libraries/${libraryId}/settings`);
  return invite;
}

/**
 * Revokes an existing invite link for a library.
 * Only library owners and admins can revoke invites.
 * Sets the invite's is_active flag to false.
 *
 * @param libraryId - The unique identifier of the library
 * @param inviteId - The unique identifier of the invite to revoke
 */
export async function revokeLibraryInvite(libraryId: string, inviteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { data: membership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', user.id)
    .single();

  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new Error('Only owners and admins can revoke invites');
  }

  const { data: updatedInvite, error } = await supabase
    .from('library_invites')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('library_id', libraryId)
    .select()
    .single();

  if (error) {
    console.error('Failed to revoke invite:', error);
    throw new Error('Failed to revoke invite');
  }

  if (!updatedInvite) {
    throw new Error('Invite not found');
  }

  revalidatePath(`/hub/libraries/${libraryId}/settings`);
  return { success: true };
}

'use server';

import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getUser } from '@/lib/auth/get-user';
import { logger } from '@/lib/logging/logger';
import { getRequestId } from '@/lib/logging/request';
import { AppError } from '@/lib/errors/app-error';
import { ERROR_CODES } from '@/lib/errors/error-codes';
import { withActionErrorHandling } from '@/lib/errors/error-handler';
import {
  CreateInviteInputSchema,
  DeleteLibraryMemberInputSchema,
  LibraryIdSchema,
  LibraryNameSchema,
  UpdateLibraryMemberRoleInputSchema,
} from './library-schema';

/**
 * Creates a new library with the current user as the owner.
 * Checks for duplicate library names (case-insensitive) within the user's existing libraries.
 *
 * @param name - The name of the library to create
 */
async function createLibraryImpl(name: string) {
  const supabase = await createClient();
  const user = await getUser();
  const correlationId = getRequestId();
  const startedAt = performance.now();
  logger.info('Create library action started', {
    correlationId,
    userId: user.id,
  });
  const parsedName = LibraryNameSchema.parse(name);

  // Duplicate name check — scoped to this user's existing libraries (case-insensitive)
  const { data: existing, error: existingError } = await supabase
    .from('library_members')
    .select('library:libraries(name)')
    .eq('user_id', user.id);
  if (existingError) {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: existingError,
    });
  }

  const duplicate = (existing ?? []).some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any) => m.library?.name?.toLowerCase() === parsedName.toLowerCase()
  );

  if (duplicate) {
    throw new AppError(
      ERROR_CODES.CONFLICT,
      'A library with this name already exists.'
    );
  }

  // Create library and owner membership atomically via RPC
  const { data, error } = await supabase.rpc('create_library_with_owner', {
    w_name: parsedName,
  });

  if (error) {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: error,
    });
  }

  if (!data) {
    throw new AppError(ERROR_CODES.DATABASE_ERROR);
  }
  const library = data as { id: string; name: string };

  revalidatePath('/hub');
  logger.info('Create library action completed', {
    correlationId,
    userId: user.id,
    libraryId: library.id,
    duration: Math.round(performance.now() - startedAt),
  });
  return library;
}

/**
 * Deletes a library by ID.
 * Only the library owner can delete the library (enforced by RLS).
 *
 * @param libraryId - The unique identifier of the library to delete
 */
async function deleteLibraryImpl(libraryId: string) {
  const supabase = await createClient();
  await getUser();
  const parsedLibraryId = LibraryIdSchema.parse(libraryId);

  // RLS will ensure only OWNER can delete
  const { error } = await supabase
    .from('libraries')
    .delete()
    .eq('id', parsedLibraryId);

  if (error) {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: error,
    });
  }

  revalidatePath('/hub');
  return { success: true };
}

/**
 * Deletes multiple libraries by their IDs.
 * Only libraries where the user is the owner will be deleted (enforced by RLS).
 *
 * @param ids - Array of library IDs to delete
 */
async function deleteLibrariesImpl(ids: string[]) {
  const parsedIds = LibraryIdSchema.array().parse(ids);
  if (!parsedIds.length) return { success: true };

  const supabase = await createClient();
  await getUser();

  // RLS ensures only libraries where user is OWNER are deleted
  const { error } = await supabase
    .from('libraries')
    .delete()
    .in('id', parsedIds);

  if (error) {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: error,
    });
  }

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
async function updateLibraryNameImpl(libraryId: string, newName: string) {
  const supabase = await createClient();
  const user = await getUser();
  const parsedLibraryId = LibraryIdSchema.parse(libraryId);
  const parsedName = LibraryNameSchema.parse(newName);

  // Check if requester is OWNER or ADMIN of library
  const { data: membership, error: membershipError } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', parsedLibraryId)
    .eq('user_id', user.id)
    .single();

  if (membershipError && membershipError.code !== 'PGRST116') {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: membershipError,
    });
  }
  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new AppError(ERROR_CODES.FORBIDDEN);
  }

  const { error } = await supabase
    .from('libraries')
    .update({ name: parsedName })
    .eq('id', parsedLibraryId);

  if (error) {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: error,
    });
  }

  revalidatePath(`/hub/libraries/${parsedLibraryId}`);
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
async function updateLibraryMemberRoleImpl(
  libraryId: string,
  userId: string,
  role: 'ADMIN' | 'EDITOR' | 'VIEWER'
) {
  const supabase = await createClient();
  const user = await getUser();
  const parsedLibraryId = LibraryIdSchema.parse(libraryId);
  const parsedUserId = DeleteLibraryMemberInputSchema.parse({ userId }).userId;
  const parsedRole = UpdateLibraryMemberRoleInputSchema.parse({ role }).role;

  // Check if requester is OWNER or ADMIN of library
  const { data: requesterMembership, error: requesterError } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', parsedLibraryId)
    .eq('user_id', user.id)
    .single();

  if (requesterError && requesterError.code !== 'PGRST116') {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: requesterError,
    });
  }
  if (
    !requesterMembership ||
    !['OWNER', 'ADMIN'].includes(requesterMembership.role)
  ) {
    throw new AppError(ERROR_CODES.FORBIDDEN);
  }

  // Check target member
  const { data: targetMembership, error: targetError } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', parsedLibraryId)
    .eq('user_id', parsedUserId)
    .single();

  if (targetError && targetError.code !== 'PGRST116') {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: targetError,
    });
  }
  if (!targetMembership) {
    throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  // Prevent modifying the library OWNER or assigning OWNER role by non-owners
  if (targetMembership.role === 'OWNER') {
    throw new AppError(
      ERROR_CODES.FORBIDDEN,
      'The library owner role cannot be changed.'
    );
  }

  // Update
  const { data: updatedMember, error } = await supabase
    .from('library_members')
    .update({ role: parsedRole })
    .eq('library_id', parsedLibraryId)
    .eq('user_id', parsedUserId)
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
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: error,
    });
  }

  revalidatePath(`/hub/libraries/${parsedLibraryId}`);
  return updatedMember;
}

/**
 * Removes a member from a library.
 * Only library owners and admins can remove members.
 * Prevents removing the library owner.
 *
 * @param libraryId - The unique identifier of the library
 * @param userId - The unique identifier of the user to remove
 */
async function removeLibraryMemberImpl(libraryId: string, userId: string) {
  const supabase = await createClient();
  const user = await getUser();
  const parsedLibraryId = LibraryIdSchema.parse(libraryId);
  const parsedUserId = DeleteLibraryMemberInputSchema.parse({ userId }).userId;

  // Check requester
  const { data: requesterMembership, error: requesterError } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', parsedLibraryId)
    .eq('user_id', user.id)
    .single();

  if (requesterError && requesterError.code !== 'PGRST116') {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: requesterError,
    });
  }
  if (
    !requesterMembership ||
    !['OWNER', 'ADMIN'].includes(requesterMembership.role)
  ) {
    throw new AppError(ERROR_CODES.FORBIDDEN);
  }

  // Check target
  const { data: targetMembership, error: targetError } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', parsedLibraryId)
    .eq('user_id', parsedUserId)
    .single();

  if (targetError && targetError.code !== 'PGRST116') {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: targetError,
    });
  }
  if (!targetMembership) {
    throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  // Prevent removing the library OWNER
  if (targetMembership.role === 'OWNER') {
    throw new AppError(
      ERROR_CODES.FORBIDDEN,
      'The library owner cannot be removed.'
    );
  }

  const { error } = await supabase
    .from('library_members')
    .delete()
    .eq('library_id', parsedLibraryId)
    .eq('user_id', parsedUserId);

  if (error) {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: error,
    });
  }

  revalidatePath(`/hub/libraries/${parsedLibraryId}`);
  return { success: true };
}

/**
 * Removes multiple members from a library in a batch operation.
 * Uses Promise.allSettled to attempt removal of all members and reports failures.
 *
 * @param libraryId - The unique identifier of the library
 * @param userIds - Array of user IDs to remove from the library
 */
async function removeMultipleLibraryMembersImpl(
  libraryId: string,
  userIds: string[]
) {
  const parsedLibraryId = LibraryIdSchema.parse(libraryId);
  const parsedUserIds = DeleteLibraryMemberInputSchema.array()
    .parse(userIds.map((userId) => ({ userId })))
    .map(({ userId }) => userId);

  const results = await Promise.allSettled(
    parsedUserIds.map((userId) =>
      removeLibraryMemberImpl(parsedLibraryId, userId)
    )
  );

  const failed = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  );
  if (failed) {
    throw failed.reason;
  }

  revalidatePath(`/hub/libraries/${parsedLibraryId}`);
  return { success: true, removedCount: parsedUserIds.length };
}

/**
 * Allows a user to leave a library they are a member of.
 * Library owners cannot leave and must transfer ownership or delete the library first.
 *
 * @param libraryId - The unique identifier of the library to leave
 */
async function leaveLibraryImpl(libraryId: string) {
  const supabase = await createClient();
  const user = await getUser();
  const parsedLibraryId = LibraryIdSchema.parse(libraryId);

  const { data: membership, error: membershipError } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', parsedLibraryId)
    .eq('user_id', user.id)
    .single();

  if (membershipError && membershipError.code !== 'PGRST116') {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: membershipError,
    });
  }
  if (!membership) {
    throw new AppError(
      ERROR_CODES.FORBIDDEN,
      'You are not a member of this library.'
    );
  }

  if (membership.role === 'OWNER') {
    throw new AppError(
      ERROR_CODES.FORBIDDEN,
      'The library owner must transfer ownership before leaving.'
    );
  }

  const { error } = await supabase.rpc('leave_library', {
    p_library_id: parsedLibraryId,
  });

  if (error) {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: error,
    });
  }

  revalidatePath('/hub');
  return { success: true };
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
async function createLibraryInviteImpl(
  libraryId: string,
  role: 'VIEWER' | 'EDITOR',
  expiresAt?: string | null,
  maxUses?: number | null
) {
  const supabase = await createClient();
  const user = await getUser();
  const parsedLibraryId = LibraryIdSchema.parse(libraryId);
  const parsedInput = CreateInviteInputSchema.parse({
    role,
    expiresAt,
    maxUses,
  });

  const { data: membership, error: membershipError } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', parsedLibraryId)
    .eq('user_id', user.id)
    .single();

  if (membershipError && membershipError.code !== 'PGRST116') {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: membershipError,
    });
  }
  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new AppError(ERROR_CODES.FORBIDDEN);
  }

  // Generate invite code
  const inviteCode = crypto
    .randomBytes(6)
    .toString('base64url')
    .substring(0, 8);

  const { data: invite, error } = await supabase
    .from('library_invites')
    .insert({
      library_id: parsedLibraryId,
      invite_code: inviteCode,
      role: parsedInput.role,
      created_by: user.id,
      expires_at: parsedInput.expiresAt || null,
      max_uses: parsedInput.maxUses || null,
    })
    .select()
    .single();

  if (error || !invite) {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: error ?? new Error('Invite not returned'),
    });
  }

  revalidatePath(`/hub/libraries/${parsedLibraryId}`);
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
async function revokeLibraryInviteImpl(libraryId: string, inviteId: string) {
  const supabase = await createClient();
  const user = await getUser();
  const parsedLibraryId = LibraryIdSchema.parse(libraryId);
  const parsedInviteId = LibraryIdSchema.parse(inviteId);

  const { data: membership, error: membershipError } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', parsedLibraryId)
    .eq('user_id', user.id)
    .single();

  if (membershipError && membershipError.code !== 'PGRST116') {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: membershipError,
    });
  }
  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new AppError(ERROR_CODES.FORBIDDEN);
  }

  const { data: updatedInvite, error } = await supabase
    .from('library_invites')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', parsedInviteId)
    .eq('library_id', parsedLibraryId)
    .select()
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: error,
    });
  }

  if (!updatedInvite) {
    throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  revalidatePath(`/hub/libraries/${parsedLibraryId}`);
  return { success: true };
}

export async function createLibrary(name: string) {
  return withActionErrorHandling(() => createLibraryImpl(name), {
    action: 'createLibrary',
  });
}

export async function deleteLibrary(libraryId: string) {
  return withActionErrorHandling(() => deleteLibraryImpl(libraryId), {
    action: 'deleteLibrary',
  });
}

export async function deleteLibraries(ids: string[]) {
  return withActionErrorHandling(() => deleteLibrariesImpl(ids), {
    action: 'deleteLibraries',
  });
}

export async function updateLibraryName(libraryId: string, newName: string) {
  return withActionErrorHandling(
    () => updateLibraryNameImpl(libraryId, newName),
    { action: 'updateLibraryName' }
  );
}

export async function updateLibraryMemberRole(
  libraryId: string,
  userId: string,
  role: 'ADMIN' | 'EDITOR' | 'VIEWER'
) {
  return withActionErrorHandling(
    () => updateLibraryMemberRoleImpl(libraryId, userId, role),
    { action: 'updateLibraryMemberRole' }
  );
}

export async function removeLibraryMember(libraryId: string, userId: string) {
  return withActionErrorHandling(
    () => removeLibraryMemberImpl(libraryId, userId),
    { action: 'removeLibraryMember' }
  );
}

export async function removeMultipleLibraryMembers(
  libraryId: string,
  userIds: string[]
) {
  return withActionErrorHandling(
    () => removeMultipleLibraryMembersImpl(libraryId, userIds),
    { action: 'removeMultipleLibraryMembers' }
  );
}

export async function leaveLibrary(libraryId: string) {
  return withActionErrorHandling(() => leaveLibraryImpl(libraryId), {
    action: 'leaveLibrary',
  });
}

export async function createLibraryInvite(
  libraryId: string,
  role: 'VIEWER' | 'EDITOR',
  expiresAt?: string | null,
  maxUses?: number | null
) {
  return withActionErrorHandling(
    () => createLibraryInviteImpl(libraryId, role, expiresAt, maxUses),
    { action: 'createLibraryInvite' }
  );
}

export async function revokeLibraryInvite(libraryId: string, inviteId: string) {
  return withActionErrorHandling(
    () => revokeLibraryInviteImpl(libraryId, inviteId),
    { action: 'revokeLibraryInvite' }
  );
}

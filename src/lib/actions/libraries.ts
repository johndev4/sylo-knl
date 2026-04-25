"use server"

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createLibrary(name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Duplicate name check — scoped to this user's existing libraries (case-insensitive)
  const { data: existing } = await supabase
    .from('library_members')
    .select('library:libraries(name)')
    .eq('user_id', user.id);

  const duplicate = (existing ?? []).some(
    (m: any) => m.library?.name?.toLowerCase() === name.trim().toLowerCase()
  );

  if (duplicate) {
    throw new Error(`A library named "${name.trim()}" already exists.`);
  }

  // Create library and owner membership atomically via RPC
  const { data, error } = await supabase.rpc('create_library_with_owner', {
    w_name: name
  });

  if (error) {
    throw new Error(error.message || "Failed to create library");
  }

  const library = data as { id: string, name: string };

  revalidatePath('/hub');
  return library;
}

export async function deleteLibrary(libraryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // RLS will ensure only OWNER can delete
  const { error } = await supabase
    .from('libraries')
    .delete()
    .eq('id', libraryId);

  if (error) throw new Error(error.message || "Failed to delete library");

  revalidatePath('/hub');
  return { success: true };
}

export async function deleteLibraries(ids: string[]) {
  if (!ids.length) return { success: true };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // RLS ensures only libraries where user is OWNER are deleted
  const { error } = await supabase
    .from('libraries')
    .delete()
    .in('id', ids);

  if (error) throw new Error(error.message || "Failed to delete libraries");

  revalidatePath('/hub');
  return { success: true };
}

// Member Management Functions

export async function fetchLibraryMembers(libraryId: string) {
  console.log(`[DEBUG] fetchLibraryMembers called for: ${libraryId}`);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Check if user is member of library
  const { data: membership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', user.id)
    .single();

  if (!membership) throw new Error("Access denied to library");

  // Fetch all members with user details
  const { data: members, error } = await supabase
    .from('library_members')
    .select(`
      library_id,
      user_id,
      role,
      created_at,
      user:user_id(id, name, email, avatar_url)
    `)
    .eq('library_id', libraryId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch members:', error);
    throw new Error('Failed to fetch members');
  }

  // Type assertion to match schema (Supabase can return slightly different shapes)
  return (members || []) as any[];
}

export async function addLibraryMember(
  libraryId: string,
  email: string,
  role: 'ADMIN' | 'EDITOR' | 'VIEWER'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Check if user is OWNER or ADMIN of library
  const { data: membership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', user.id)
    .single();

  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new Error("Only owners and admins can add members");
  }

  // Find user by email
  const { data: userData } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email.toLowerCase())
    .single();

  if (!userData) throw new Error("User not found with that email");

  // Check if user is already a member
  const { data: existingMembership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', userData.id)
    .single();

  if (existingMembership) throw new Error("User is already a member of this library");

  // Check member limit (max 11 members per library)
  const { data: memberCount } = await supabase
    .from('library_members')
    .select('*', { count: 'exact' })
    .eq('library_id', libraryId);

  if ((memberCount?.length || 0) >= 11) {
    throw new Error("Library has reached maximum member limit of 11");
  }

  // Add member to library
  const { data: newMember, error } = await supabase
    .from('library_members')
    .insert({
      library_id: libraryId,
      user_id: userData.id,
      role: role,
    })
    .select(`
      library_id,
      user_id,
      role,
      created_at,
      user:user_id(id, name, email, avatar_url)
    `)
    .single();

  if (error) {
    console.error('Failed to add member:', error);
    throw new Error('Failed to add member');
  }

  revalidatePath(`/hub/${libraryId}`);
  return newMember;
}

export async function updateLibraryMemberRole(
  libraryId: string,
  userId: string,
  role: 'ADMIN' | 'EDITOR' | 'VIEWER'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Check if requester is OWNER or ADMIN of library
  const { data: requesterMembership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', user.id)
    .single();

  if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
    throw new Error("Only owners and admins can modify member roles");
  }

  // Check target member
  const { data: targetMembership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', userId)
    .single();

  if (!targetMembership) throw new Error("Member not found in library");

  // Prevent demoting the only OWNER
  if (targetMembership.role === 'OWNER') {
    const { data: otherOwners } = await supabase
      .from('library_members')
      .select('user_id')
      .eq('library_id', libraryId)
      .eq('role', 'OWNER')
      .neq('user_id', userId);

    if (!otherOwners || otherOwners.length === 0) {
      throw new Error("Cannot demote the only owner of the library");
    }
  }

  // Update
  const { data: updatedMember, error } = await supabase
    .from('library_members')
    .update({ role })
    .eq('library_id', libraryId)
    .eq('user_id', userId)
    .select(`
      library_id,
      user_id,
      role,
      created_at,
      user:user_id(id, name, email, avatar_url)
    `)
    .single();

  if (error) {
    console.error('Failed to update member role:', error);
    throw new Error('Failed to update member role');
  }

  revalidatePath(`/hub/${libraryId}`);
  return updatedMember;
}

export async function removeLibraryMember(
  libraryId: string,
  userId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Check requester
  const { data: requesterMembership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', user.id)
    .single();

  if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
    throw new Error("Only owners and admins can remove members");
  }

  // Check target
  const { data: targetMembership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', userId)
    .single();

  if (!targetMembership) throw new Error("Member not found");

  // Prevent removing only owner
  if (targetMembership.role === 'OWNER') {
    const { data: otherOwners } = await supabase
      .from('library_members')
      .select('user_id')
      .eq('library_id', libraryId)
      .eq('role', 'OWNER')
      .neq('user_id', userId);

    if (!otherOwners || otherOwners.length === 0) {
      throw new Error("Cannot remove the only owner");
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

  revalidatePath(`/hub/${libraryId}`);
  return { success: true };
}

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

  revalidatePath(`/hub/${libraryId}`);
  return { success: true, removedCount: userIds.length };
}

// Leave library (for current user)
export async function leaveLibrary(libraryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Verify user is not the owner
  const { data: membership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', user.id)
    .single();

  if (!membership) throw new Error("Not a member of this library");
  if (membership.role === 'OWNER') {
    throw new Error("Library owner cannot leave. Delete or transfer ownership first.");
  }

  // Remove user from library
  const { error } = await supabase
    .from('library_members')
    .delete()
    .eq('library_id', libraryId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message || "Failed to leave library");

  revalidatePath('/hub');
  return { success: true };
}

export async function updateLibraryName(libraryId: string, newName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Check if requester is OWNER or ADMIN of library
  const { data: membership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', libraryId)
    .eq('user_id', user.id)
    .single();

  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new Error("Only owners and admins can rename the library");
  }

  const { error } = await supabase
    .from('libraries')
    .update({ name: newName.trim() })
    .eq('id', libraryId);

  if (error) {
    console.error('Failed to update library name:', error);
    throw new Error(error.message || 'Failed to update library name');
  }

  revalidatePath(`/hub/${libraryId}/settings`);
  revalidatePath('/hub');
  return { success: true };
}

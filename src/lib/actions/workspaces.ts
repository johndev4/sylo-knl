"use server"

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createWorkspace(name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Duplicate name check — scoped to this user's existing workspaces (case-insensitive)
  const { data: existing } = await supabase
    .from('workspace_members')
    .select('workspace:workspaces(name)')
    .eq('user_id', user.id);

  const duplicate = (existing ?? []).some(
    (m: any) => m.workspace?.name?.toLowerCase() === name.trim().toLowerCase()
  );

  if (duplicate) {
    throw new Error(`A workspace named "${name.trim()}" already exists.`);
  }

  // Create Workspace and Membership atomically via RPC
  const { data, error } = await supabase.rpc('create_workspace_with_owner', {
    w_name: name
  });

  if (error) {
    throw new Error(error.message || "Failed to create workspace");
  }

  const workspace = data as { id: string, name: string };

  revalidatePath('/spaces');
  return workspace;
}

export async function deleteWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // RLS will ensure only OWNER can delete
  const { error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', workspaceId);

  if (error) throw new Error(error.message || "Failed to delete workspace");

  revalidatePath('/spaces');
  return { success: true };
}

export async function deleteWorkspaces(ids: string[]) {
  if (!ids.length) return { success: true };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // RLS ensures only workspaces where user is OWNER are deleted
  const { error } = await supabase
    .from('workspaces')
    .delete()
    .in('id', ids);

  if (error) throw new Error(error.message || "Failed to delete workspaces");

  revalidatePath('/spaces');
  return { success: true };
}

// Member Management Functions

export async function fetchWorkspaceMembers(workspaceId: string) {
  console.log(`[DEBUG] fetchWorkspaceMembers called for: ${workspaceId}`);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Check if user is member of workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!membership) throw new Error("Access denied to workspace");

  // Fetch all members with user details
  const { data: members, error } = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      user_id,
      role,
      created_at,
      user:user_id(id, name, email, avatar_url)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch members:', error);
    throw new Error('Failed to fetch members');
  }

  // Type assertion to match schema (Supabase can return slightly different shapes)
  return (members || []) as any[];
}

export async function addWorkspaceMember(
  workspaceId: string,
  email: string,
  role: 'ADMIN' | 'EDITOR' | 'VIEWER'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Check if user is OWNER or ADMIN of workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
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
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userData.id)
    .single();

  if (existingMembership) throw new Error("User is already a member of this workspace");

  // Check member limit (max 11 members per workspace)
  const { data: memberCount } = await supabase
    .from('workspace_members')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId);

  if ((memberCount?.length || 0) >= 11) {
    throw new Error("Workspace has reached maximum member limit of 11");
  }

  // Add member to workspace
  const { data: newMember, error } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspaceId,
      user_id: userData.id,
      role: role,
    })
    .select(`
      workspace_id,
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

  revalidatePath(`/spaces/${workspaceId}`);
  return newMember;
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: 'ADMIN' | 'EDITOR' | 'VIEWER'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Check if requester is OWNER or ADMIN of workspace
  const { data: requesterMembership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
    throw new Error("Only owners and admins can modify member roles");
  }

  // Check target member
  const { data: targetMembership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (!targetMembership) throw new Error("Member not found in workspace");

  // Prevent demoting the only OWNER
  if (targetMembership.role === 'OWNER') {
    const { data: otherOwners } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'OWNER')
      .neq('user_id', userId);

    if (!otherOwners || otherOwners.length === 0) {
      throw new Error("Cannot demote the only owner of the workspace");
    }
  }

  // Update
  const { data: updatedMember, error } = await supabase
    .from('workspace_members')
    .update({ role })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .select(`
      workspace_id,
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

  revalidatePath(`/spaces/${workspaceId}`);
  return updatedMember;
}

export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Check requester
  const { data: requesterMembership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
    throw new Error("Only owners and admins can remove members");
  }

  // Check target
  const { data: targetMembership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (!targetMembership) throw new Error("Member not found");

  // Prevent removing only owner
  if (targetMembership.role === 'OWNER') {
    const { data: otherOwners } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'OWNER')
      .neq('user_id', userId);

    if (!otherOwners || otherOwners.length === 0) {
      throw new Error("Cannot remove the only owner");
    }
  }

  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to remove member:', error);
    throw new Error('Failed to remove member');
  }

  revalidatePath(`/spaces/${workspaceId}`);
  return { success: true };
}

export async function removeMultipleWorkspaceMembers(
  workspaceId: string,
  userIds: string[]
) {
  const results = await Promise.allSettled(
    userIds.map((userId) => removeWorkspaceMember(workspaceId, userId))
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    throw new Error(`Failed to remove ${failed.length} member(s)`);
  }

  revalidatePath(`/spaces/${workspaceId}`);
  return { success: true, removedCount: userIds.length };
}

// Leave Workspace (for current user)
export async function leaveWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Verify user is not the owner
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!membership) throw new Error("Not a member of this workspace");
  if (membership.role === 'OWNER') {
    throw new Error("Workspace owner cannot leave. Delete or transfer ownership first.");
  }

  // Remove user from workspace
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message || "Failed to leave workspace");

  revalidatePath('/spaces');
  return { success: true };
}

export async function updateWorkspaceName(workspaceId: string, newName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Check if requester is OWNER or ADMIN of workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new Error("Only owners and admins can rename the workspace");
  }

  const { error } = await supabase
    .from('workspaces')
    .update({ name: newName.trim() })
    .eq('id', workspaceId);

  if (error) {
    console.error('Failed to update workspace name:', error);
    throw new Error(error.message || 'Failed to update workspace name');
  }

  revalidatePath(`/spaces/${workspaceId}/settings`);
  revalidatePath('/spaces');
  return { success: true };
}

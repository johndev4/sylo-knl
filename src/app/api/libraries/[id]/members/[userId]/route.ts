'use server';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { UpdateLibraryMemberRoleSchema } from '@/lib/validation/library.schema';

/**
 * PATCH /api/hub/[id]/members/[userId]
 * Update member role
 * Requires: User is OWNER or ADMIN of library
 * Restrictions: Cannot promote to OWNER, cannot demote the only OWNER
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: libraryId, userId } = await context.params;
    const body = await request.json();

    // Validate input
    const validationResult = UpdateLibraryMemberRoleSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { role: newRole } = validationResult.data;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if requester is OWNER or ADMIN of library
    const { data: requesterMembership } = await supabase
      .from('library_members')
      .select('role')
      .eq('library_id', libraryId)
      .eq('user_id', user.id)
      .single();

    if (!requesterMembership) {
      return NextResponse.json(
        { error: 'Access denied to library' },
        { status: 403 }
      );
    }

    if (!['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can modify member roles' },
        { status: 403 }
      );
    }

    // Check if target member exists
    const { data: targetMembership } = await supabase
      .from('library_members')
      .select('role')
      .eq('library_id', libraryId)
      .eq('user_id', userId)
      .single();

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'Member not found in library' },
        { status: 404 }
      );
    }

    const targetRole = targetMembership.role as string;
    const newRoleStr = newRole as string;

    // Prevent demoting the only OWNER
    if (targetRole === 'OWNER') {
      // Check if there are other owners
      const { data: otherOwners } = await supabase
        .from('library_members')
        .select('user_id')
        .eq('library_id', libraryId)
        .eq('role', 'OWNER')
        .neq('user_id', userId);

      if (!otherOwners || otherOwners.length === 0) {
        return NextResponse.json(
          { error: 'Cannot demote the only owner of the library' },
          { status: 409 }
        );
      }
    }

    // Prevent demoting yourself if you're the only owner
    if (requesterMembership.role === 'OWNER' && user.id === userId) {
      const { data: otherOwners } = await supabase
        .from('library_members')
        .select('user_id')
        .eq('library_id', libraryId)
        .eq('role', 'OWNER')
        .neq('user_id', user.id);

      if (!otherOwners || otherOwners.length === 0) {
        return NextResponse.json(
          { error: 'Cannot demote yourself if you are the only owner' },
          { status: 409 }
        );
      }
    }

    // Update member role
    const { data: updatedMember, error } = await supabase
      .from('library_members')
      .update({ role: newRole })
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
      return NextResponse.json(
        { error: 'Failed to update member role' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedMember }, { status: 200 });
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/hub/[id]/members/[userId]
 * Remove member from library
 * Requires: User is OWNER or ADMIN of library
 * Restrictions: Cannot remove the only OWNER, cannot remove yourself if you're the only OWNER
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: libraryId, userId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if requester is OWNER or ADMIN of library
    const { data: requesterMembership } = await supabase
      .from('library_members')
      .select('role')
      .eq('library_id', libraryId)
      .eq('user_id', user.id)
      .single();

    if (!requesterMembership) {
      return NextResponse.json(
        { error: 'Access denied to library' },
        { status: 403 }
      );
    }

    if (!['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can remove members' },
        { status: 403 }
      );
    }

    // Check if target member exists
    const { data: targetMembership } = await supabase
      .from('library_members')
      .select('role')
      .eq('library_id', libraryId)
      .eq('user_id', userId)
      .single();

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'Member not found in library' },
        { status: 404 }
      );
    }

    // Prevent removing the only OWNER
    if (targetMembership.role === 'OWNER') {
      const { data: otherOwners } = await supabase
        .from('library_members')
        .select('user_id')
        .eq('library_id', libraryId)
        .eq('role', 'OWNER')
        .neq('user_id', userId);

      if (!otherOwners || otherOwners.length === 0) {
        return NextResponse.json(
          { error: 'Cannot remove the only owner of the library' },
          { status: 409 }
        );
      }
    }

    // Remove member from library
    const { error } = await supabase
      .from('library_members')
      .delete()
      .eq('library_id', libraryId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to remove member:', error);
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error removing member from library:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

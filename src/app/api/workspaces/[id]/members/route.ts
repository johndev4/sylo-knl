'use server';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { AddWorkspaceMemberSchema } from '@/lib/validation/workspace.schema';

/**
 * GET /api/workspaces/[id]/members
 * List all members of a workspace
 * Requires: User is member of workspace
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is member of workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to workspace' },
        { status: 403 }
      );
    }

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
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: members || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching workspace members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces/[id]/members
 * Add a member to workspace by email
 * Requires: User is OWNER or ADMIN of workspace
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await context.params;
    const body = await request.json();

    // Validate input
    const validationResult = AddWorkspaceMemberSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role } = validationResult.data;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is OWNER or ADMIN of workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to workspace' },
        { status: 403 }
      );
    }

    if (!['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can add members' },
        { status: 403 }
      );
    }

    // Find user by email
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (!users) {
      return NextResponse.json(
        { error: 'User not found with that email' },
        { status: 404 }
      );
    }

    const newMemberId = users.id;

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', newMemberId)
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this workspace' },
        { status: 409 }
      );
    }

    // Check member limit (max 11 members per workspace)
    const { data: memberCount } = await supabase
      .from('workspace_members')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId);

    if ((memberCount?.length || 0) >= 11) {
      return NextResponse.json(
        { error: 'Workspace has reached maximum member limit of 11' },
        { status: 409 }
      );
    }

    // Add member to workspace
    const { data: newMember, error } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: newMemberId,
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
      return NextResponse.json(
        { error: 'Failed to add member' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newMember }, { status: 201 });
  } catch (error) {
    console.error('Error adding member to workspace:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

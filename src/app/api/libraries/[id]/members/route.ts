'use server';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { AddLibraryMemberSchema } from '@/lib/validation/library.schema';

/**
 * GET /api/hub/[id]/members
 * List all members of a library
 * Requires: User is member of library
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is member of library
    const { data: membership } = await supabase
      .from('library_members')
      .select('role')
      .eq('library_id', libraryId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to library' },
        { status: 403 }
      );
    }

    // Fetch all members with user details
    const { data: members, error } = await supabase
      .from('library_members')
      .select(
        `
        library_id,
        user_id,
        role,
        created_at,
        user:user_id(id, name, email, avatar_url)
      `
      )
      .eq('library_id', libraryId)
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
    console.error('Error fetching library members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hub/[id]/members
 * Add a member to library by email
 * Requires: User is OWNER or ADMIN of library
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;
    const body = await request.json();

    // Validate input
    const validationResult = AddLibraryMemberSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role } = validationResult.data;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is OWNER or ADMIN of library
    const { data: membership } = await supabase
      .from('library_members')
      .select('role')
      .eq('library_id', libraryId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to library' },
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
      .from('library_members')
      .select('role')
      .eq('library_id', libraryId)
      .eq('user_id', newMemberId)
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this library' },
        { status: 409 }
      );
    }

    // Check member limit (max 11 members per library)
    const { data: memberCount } = await supabase
      .from('library_members')
      .select('*', { count: 'exact' })
      .eq('library_id', libraryId);

    if ((memberCount?.length || 0) >= 11) {
      return NextResponse.json(
        { error: 'Library has reached maximum member limit of 11' },
        { status: 409 }
      );
    }

    // Add member to library
    const { data: newMember, error } = await supabase
      .from('library_members')
      .insert({
        library_id: libraryId,
        user_id: newMemberId,
        role: role,
      })
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
      console.error('Failed to add member:', error);
      return NextResponse.json(
        { error: 'Failed to add member' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newMember }, { status: 201 });
  } catch (error) {
    console.error('Error adding member to library:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

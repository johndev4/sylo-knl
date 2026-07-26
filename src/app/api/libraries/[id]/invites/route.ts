import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateInviteSchema } from '@/lib/validation/library-schema';
import crypto from 'crypto';

function generateInviteCode() {
  // Generate an 8-character alphanumeric code
  return crypto.randomBytes(6).toString('base64url').substring(0, 8);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;
    const body = await request.json();

    const validationResult = CreateInviteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { role, expiresAt, maxUses } = validationResult.data;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('library_members')
      .select('role')
      .eq('library_id', libraryId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can create invites' },
        { status: 403 }
      );
    }

    const inviteCode = generateInviteCode();

    const { data: invite, error } = await supabase
      .from('library_invites')
      .insert({
        library_id: libraryId,
        invite_code: inviteCode,
        role: role,
        created_by: user.id,
        expires_at: expiresAt || null,
        max_uses: maxUses || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create invite:', error);
      return NextResponse.json(
        { error: 'Failed to create invite' },
        { status: 500 }
      );
    }

    // Determine the origin for the URL
    const origin = request.headers.get('origin') || new URL(request.url).origin;
    const inviteUrl = `${origin}/join/${inviteCode}`;

    return NextResponse.json(
      { data: { ...invite, inviteUrl } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /invites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const { data: membership } = await supabase
      .from('library_members')
      .select('role')
      .eq('library_id', libraryId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can view invites' },
        { status: 403 }
      );
    }

    const { data: invites, error } = await supabase
      .from('library_invites')
      .select(`
        *,
        created_by_user:users!library_invites_created_by_fkey(id, name, email, avatar_url)
      `)
      .eq('library_id', libraryId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch invites:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invites' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: invites || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /invites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

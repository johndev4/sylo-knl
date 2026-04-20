import { createClient } from '@/lib/supabase/server';
import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';

// Valid IANA timezone identifiers (curated list)
const VALID_TIMEZONES = [
  'UTC',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam', 'Europe/Brussels',
  'Europe/Vienna', 'Europe/Prague', 'Europe/Warsaw', 'Europe/Moscow', 'Europe/Istanbul',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Hong_Kong', 'Asia/Shanghai',
  'Asia/Tokyo', 'Asia/Seoul', 'Asia/Singapore', 'Asia/Manila', 'Asia/Jakarta',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth',
  'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Honolulu',
];

const updateProfileSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  bio: z.string().max(500).trim().optional(),
  timezone: z.union([
    z.enum(VALID_TIMEZONES as [string, ...string[]]),
    z.literal(""),
    z.null()
  ]).optional().transform(v => (v === "" || v === null) ? null : v),
  useAvatarUrl: z.boolean().optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user profile from database
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('id, email, name, avatar_url, bio, timezone, use_avatar_url')
      .eq('id', user.id)
      .single();

    if (error || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Map DB snake_case to frontend camelCase expectations
    const mappedProfile = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      avatarUrl: userProfile.avatar_url,
      bio: userProfile.bio,
      timezone: userProfile.timezone,
      useAvatarUrl: userProfile.use_avatar_url,
    };

    return NextResponse.json(mappedProfile);
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsedData = updateProfileSchema.parse(body);

    const updateData: any = {};
    if (parsedData.name) updateData.name = parsedData.name;
    if (parsedData.bio !== undefined) updateData.bio = parsedData.bio;
    if (parsedData.timezone !== undefined) updateData.timezone = parsedData.timezone;
    if (parsedData.useAvatarUrl !== undefined) updateData.use_avatar_url = parsedData.useAvatarUrl;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select('id, email, name, avatar_url, bio, timezone, use_avatar_url')
      .single();

    if (error || !updatedUser) {
      throw error || new Error('Update failed');
    }

    const mappedProfile = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      avatarUrl: updatedUser.avatar_url,
      bio: updatedUser.bio,
      timezone: updatedUser.timezone,
      useAvatarUrl: updatedUser.use_avatar_url,
    };

    return NextResponse.json(mappedProfile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Failed to update user profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

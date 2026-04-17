import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { ensureUserExists } from '@/lib/db/user';

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
  timezone: z.enum(VALID_TIMEZONES as [string, ...string[]]).optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Ensure user exists in database (handles trigger delay/failure)
    await ensureUserExists(user);

    // Fetch user profile from database
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        timezone: true,
      },
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(userProfile);
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Ensure user exists in database (handles trigger delay/failure)
    await ensureUserExists(user);

    // Parse and validate request body
    const body = await request.json();
    const parsedData = updateProfileSchema.parse(body);

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(parsedData.name && { name: parsedData.name }),
        ...(parsedData.bio !== undefined && { bio: parsedData.bio }),
        ...(parsedData.timezone && { timezone: parsedData.timezone }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        timezone: true,
      },
    });

    return NextResponse.json(updatedUser);
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
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

import prisma from '@/lib/db';

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

/**
 * Ensures a user exists in the database by upserting their record.
 * This is a safety mechanism to handle cases where the database trigger
 * may not have fired or completed yet.
 *
 * @param user Supabase auth user object
 * @returns Created or updated user record
 */
export async function ensureUserExists(user: SupabaseUser) {
  if (!user.email) {
    throw new Error('User email is required');
  }

  return await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || null,
      avatarUrl: user.user_metadata?.avatar_url || null,
    },
    update: {
      email: user.email,
      name: user.user_metadata?.full_name || undefined,
      avatarUrl: user.user_metadata?.avatar_url || undefined,
      updatedAt: new Date(),
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
}

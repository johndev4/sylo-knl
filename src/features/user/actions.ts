'use server';

import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/get-user';
import {
  UpdateProfileInput,
  UpdateProfileInputSchema,
  UserProfileSchema,
} from './user-schema';

/**
 * Updates the user profile for the currently authenticated user.
 * Validates input with Zod and only updates fields that are provided.
 *
 * @param data - Partial profile data to update
 * @returns The updated user profile mapped to frontend-friendly camelCase
 */
export async function updateUserProfile(data: UpdateProfileInput) {
  const user = await getUser();
  const supabase = await createClient();

  // Validate input
  const parsedData = UpdateProfileInputSchema.parse(data);

  // Build update object - only include defined fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};
  if (parsedData.name !== undefined) updateData.name = parsedData.name;
  if (parsedData.bio !== undefined) updateData.bio = parsedData.bio;
  if (parsedData.timezone !== undefined)
    updateData.timezone = parsedData.timezone;
  if (parsedData.useAvatarUrl !== undefined)
    updateData.use_avatar_url = parsedData.useAvatarUrl;

  const { data: updatedUser, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', user.id)
    .select('id, email, name, avatar_url, bio, timezone, use_avatar_url')
    .single();

  if (error || !updatedUser) {
    throw error || new Error('Update failed');
  }

  return UserProfileSchema.parse({
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    avatarUrl: updatedUser.avatar_url,
    bio: updatedUser.bio,
    timezone: updatedUser.timezone,
    useAvatarUrl: updatedUser.use_avatar_url,
  });
}

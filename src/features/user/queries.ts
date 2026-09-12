import { SupabaseClient, User } from '@supabase/supabase-js';
import {
  ProfileDropdownUserInfoSchema,
  UserProfileSchema,
} from './user-schema';

/** Shared SWR cache key for the account-dropdown profile data. */
export const SWR_PROFILE_KEY = '/user/profile-dropdown';

/**
 * Retrieves the user profile for the currently authenticated user.
 *
 * @param supabase - SupabaseClient instance for database operations
 * @param user - User object containing the current user's information
 */
export async function getUserProfile(supabase: SupabaseClient, user: User) {
  // Fetch user profile from database
  const { data: userProfile, error } = await supabase
    .from('users')
    .select('id, email, name, avatar_url, bio, timezone, use_avatar_url')
    .eq('id', user.id)
    .single();

  if (error || !userProfile) {
    throw new Error('User profile not found');
  }

  return UserProfileSchema.parse({
    id: userProfile.id,
    email: userProfile.email,
    name: userProfile.name,
    avatarUrl: userProfile.avatar_url,
    bio: userProfile.bio,
    timezone: userProfile.timezone,
    useAvatarUrl: userProfile.use_avatar_url,
  });
}

/**
 * Retrieves minimal user profile info for the account dropdown component.
 *
 * @param supabase - SupabaseClient instance for database operations
 * @param user - User object containing the current user's information
 */
export async function getProfileDropdownUserInfo(
  supabase: SupabaseClient,
  user: User
) {
  // Fetch user profile from database
  const { data: userInfo, error } = await supabase
    .from('users')
    .select('email, name, avatar_url, use_avatar_url')
    .eq('id', user.id)
    .single();

  if (error || !userInfo) {
    throw new Error('User info not found');
  }

  return ProfileDropdownUserInfoSchema.parse({
    email: userInfo.email,
    name: userInfo.name,
    avatarUrl: userInfo.avatar_url,
    useAvatarUrl: userInfo.use_avatar_url,
  });
}

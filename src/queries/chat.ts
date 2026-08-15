/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Retrieves all libraries that the current user is a member of.
 *
 * @param supabase - SupabaseClient instance for database operations
 * @param user - User object containing the current user's information
 */
export async function getUserLibraries(supabase: SupabaseClient, user: User) {
  const { data, error } = await supabase
    .from('library_members')
    .select('role, library:libraries(id, name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch user libraries:', error);
    throw new Error('Failed to fetch libraries');
  }

  return (data ?? []).map((m: any) => ({
    id: m.library.id as string,
    name: m.library.name as string,
    role: m.role as string,
  }));
}

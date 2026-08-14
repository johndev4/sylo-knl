/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

/**
 * Retrieves all libraries that the current user is a member of.
 *
 * @param supabase - Optional SupabaseClient instance. If not provided, a new browser client will be created
 */
export async function getUserLibraries(supabase?: SupabaseClient) {
  if (!supabase) {
    const { createClient } = await import('@/lib/supabase/client');
    supabase = createClient();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

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

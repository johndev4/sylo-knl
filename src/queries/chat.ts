/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Fetch all libraries the current user is a member of.
 * Used by the unified chat page to populate the library selector.
 */
export async function getUserLibraries() {
  const supabase = await createClient();
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

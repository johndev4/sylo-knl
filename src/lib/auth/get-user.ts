import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 *
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('Error fetching user:', error);
    redirect('/login');
  }

  return user;
});

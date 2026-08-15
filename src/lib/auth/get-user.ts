import { cache } from 'react';
import { createClient } from '@/lib/supabase/server'; // adjust to your actual path

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

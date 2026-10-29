'use client';

import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/components/providers/auth-provider';
import { getUserLibraries } from '@/features/chat/queries';

export function useUserLibrariesSWR() {
  const { user } = useSession();

  const fetcher = async () => {
    if (!user) return [];
    const supabase = createClient();
    return await getUserLibraries(supabase, user);
  };

  const { data, error, isLoading, mutate } = useSWR(
    user ? ['/user/libraries', user.id] : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    }
  );

  return {
    libraries: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

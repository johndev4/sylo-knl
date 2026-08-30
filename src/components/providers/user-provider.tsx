'use client';

import { createContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

type UserContextType = {
  user: User | null;
};

export const UserContext = createContext<UserContextType>({
  user: null,
});

export function UserProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: User | null;
}) {
  // Initialize state directly from Server Component prop (No loading state needed!)
  const [user, setUser] = useState<User | null>(initialUser);
  const supabase = createClient();

  useEffect(() => {
    // Keep local user state synced with auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>
  );
}

'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { dequal } from 'dequal';

type AuthSessionContextType = {
  user: User | null;
};

const AuthContext = createContext<AuthSessionContextType>({
  user: null,
});

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser: User | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  // Initialize state directly from Server Component prop (No loading state needed!)
  const [user, setUser] = useState<User | null>(initialUser);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Keep local user state synced with auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser((prev) => {
        if (dequal(prev, newUser)) return prev;
        return newUser;
      });
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
  );
}

// Custom hook to consume the user in any Client Component
export function useSession() {
  return useContext(AuthContext);
}

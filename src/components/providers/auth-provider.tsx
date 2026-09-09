'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthChangeEvent, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

type AuthSessionContextType = {
  user: User | null;
  event: AuthChangeEvent | null;
};

const AuthContext = createContext<AuthSessionContextType>({
  user: null,
  event: null,
});

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser: User | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  // Initialize state directly from Server Component prop (No loading state needed!)
  const [user, setUser] = useState<User | null>(initialUser);
  const [event, setEvent] = useState<AuthChangeEvent | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // console.debug('[AuthProvider] mounted');
    // Keep local user state synced with auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // console.debug('[AuthProvider - onAuthStateChange] Event:', _event);
      // console.debug(
      //   '[AuthProvider - onAuthStateChange] User:',
      //   session?.user ?? null
      // );
      setEvent(_event);
      setUser(session?.user ?? null);
    });

    return () => {
      // console.debug('[AuthProvider] unsubscribe from onAuthStateChange');
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, event }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to consume the user in any Client Component
export function useSession() {
  return useContext(AuthContext);
}

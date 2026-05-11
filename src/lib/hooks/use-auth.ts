'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          setUser({
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.full_name,
            avatar_url: authUser.user_metadata?.avatar_url,
          });
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();
  }, []);

  return { user, isLoading };
}
